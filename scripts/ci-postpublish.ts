import { gitDiffFrom } from 'git-diff-from';
import { __root } from '../test/__root';
import { gitlog } from 'gitlog2';
import Bluebird from 'bluebird';
import micromatch, { not, match } from 'micromatch';
import { updateChangelogByCwd } from '@yarn-tool/changelog';
import { console } from 'debug-color2';
import { getGitLogs } from '../lib/git/git-logs';
import { lazyCommitFiles } from '../lib/git/commit';
import { outputFile, outputJSON, readJSON } from 'fs-extra';
import { __file_publish_tags_json } from '../lib/const';
import { array_unique_overwrite } from 'array-hyper-unique';
import { LF } from 'crlf-normalize';

export default Bluebird.resolve((process.env as any).GITHUB_SHA as string)
	.then((from) =>
	{
		from ||= 'origin/master';

		console.dir({
			from,
		});

		//from = '2d01cffc5da15e0a34a40b40ec3b7d0cc7612dda';

		const latestLog = getGitLogs()[0]

		let to = latestLog.hash;

		console.log(`input`);

		console.dir({
			from,
			to,
			head: {
				subject: latestLog.subject,
			},
		});

		return Bluebird.props({
			info: gitDiffFrom(from, to, {
				cwd: __root,
			}),
			latestLog,
		})
	})
	.then(async ({
		info,
		latestLog,
	}) =>
	{

		const files = not(info.files, [
			'CHANGELOG.md',
			'test/**',
			'.run/**',
			'docs/**',
			'coverage/**',
			'test/**',
			'*.*',
			'.*',
		]);

		//console.dir(files);
		//console.dir(info);

		console.log(`result`);

		const isSameHash = info.from === info.to;
		const isBuildCommit = latestLog.subject.startsWith('build(release): update build');

		const result = {
			from: info.from,
			to: info.to,
			changed: files.length,
			isSameHash,
			isBuildCommit,
		};

		console.dir(result);

		if (isSameHash)
		{
			console.error(`git 沒有變化 或 遠端與本地無法比對差異`)

			if (!isBuildCommit)
			{
				return
			}

			console.yellow.warn(`前次任務可能未正確執行 CHANGELOG，嘗試檢測差異列表`)
		}

		let _do = await Promise.resolve().then(() =>
		{
			let _files: string[];

			if (files.length)
			{
				if (includeJar(files))
				{
					_files = files
				}
			}
			else if (isBuildCommit && includeJar(latestLog.files))
			{
				_files = latestLog.files
			}

			if (typeof _files?.length === 'number')
			{
				if (_files.length < 10)
				{
					console.log(`files`);
					console.dir(_files);
				}

				return true
			}

			return false;
		});

		if (_do)
		{
			await updateChangelogByCwd(__root, {
				type: 'independent',
			});

			const { __plugin_zh_cn_version } = await import('../lib/const/link-of-zh-cn');

			await readJSON(__file_publish_tags_json)
				.catch(e => [])
				.then((tags: string[]) =>
				{
					if (!tags.includes(__plugin_zh_cn_version))
					{
						tags.push(__plugin_zh_cn_version);
					}
					return array_unique_overwrite(tags)
				})
				.then(tags =>
				{
					return outputJSON(__file_publish_tags_json, tags, {
						spaces: 2,
						EOL: LF,
					})
				})
			;

			await lazyCommitFiles([
				'./CHANGELOG.md',
				'./lib/const/publish-tags.json',
			], `build(changelog): update CHANGELOG ( ${__plugin_zh_cn_version} )`);
		}
		else
		{
			console.warn(`編譯版本沒有任何變化`)
		}

		return result
	})
//.tap(console.dir)
;

function includeJar(files: string[])
{
	return micromatch(files, [
		'plugin-dev-out/*.jar',
	]).length > 0
}
