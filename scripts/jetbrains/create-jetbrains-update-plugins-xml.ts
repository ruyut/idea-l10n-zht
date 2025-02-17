import Bluebird from 'bluebird';
import { outputFile, readJSON } from 'fs-extra';
import { join } from 'upath2';
import { __root } from '../../test/__root';
import { LF } from 'crlf-normalize';
import { _getVersionInfoBySeries, _getVersionInfoByVersion } from '../../lib/util/version-map';
import { array_unique, array_unique_overwrite } from 'array-hyper-unique';
import { __file_publish_tags_json } from '../../lib/const';

/**
 * @see https://plugins.jetbrains.com/docs/intellij/update-plugins-format.html#format-of-updatepluginsxml-file
 * @see https://www.jetbrains.com/help/idea/2016.3/adding-plugins-to-enterprise-repositories.html
 * @see https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000113284-EAP-channel-for-plugins
 */
export default Bluebird.resolve()
	.then(async () =>
	{
		const tags = await readJSON(__file_publish_tags_json).catch(e => []) as string[];

		const { __plugin_zh_cn_version } = await import('../../lib/const/link-of-zh-cn');

		const lines: string[] = [];

		lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
		lines.push(`<plugins>`);

		array_unique([
			__plugin_zh_cn_version,
			...tags,
		])
			.forEach((version) =>
			{

				const since = getVersionSinceLazy(version);

				let href = `https://github.com/bluelovers/idea-l10n-zht/raw/v${version}/plugin-dev-out/zh.jar`;

				if (version === __plugin_zh_cn_version)
				{
					href = `https://github.com/bluelovers/idea-l10n-zht/raw/master/plugin-dev-out/zh.jar`;
				}

				lines.push(`  <plugin
    id="com.intellij.zh-tw"
    url="${href}"
    version="${version}">
    <idea-version since-build="${since}" />
  </plugin>
  <plugin
    id="sc.plugin.com.intellij.zh-tw"
    url="${href}"
    version="${version}">
    <idea-version since-build="${since}" />
  </plugin>`);

			})

		lines.push(`</plugins>`);

		return outputFile(join(__root, 'plugin-dev-out', 'updatePlugins.xml'), lines.join(LF))
	})
;

function getVersionSinceLazy(versionOrSeries: string)
{
	return (_getVersionInfoByVersion(versionOrSeries) ?? _getVersionInfoBySeries(versionOrSeries)).since
}
