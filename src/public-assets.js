import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { load } from 'cheerio';

export const createPublicAssets = async (publicDir) => {
  const resolvePublic = { name: 'public-paths', setup(builder) {
    builder.onResolve({ filter: /^\/(scripts|styles)\/|\?/ }, (args) => ({
      path: args.path.startsWith('/')
        ? path.join(publicDir, args.path.split('?')[0])
        : path.resolve(args.resolveDir, args.path.split('?')[0])
    }));
  } };
  const options = { bundle: true, minify: true, write: false, logLevel: 'silent', plugins: [resolvePublic], target: ['chrome120', 'firefox120', 'safari17'] };
  const javascript = await build({ ...options, entryPoints: [path.join(publicDir, 'scripts/app.js')], format: 'esm' });
  const styles = ['base', 'layout', 'about', 'projects', 'experience', 'consent', 'main', 'refinements', 'cinema'];
  const stylesheet = await build({ ...options, stdin: { contents: styles.map((name) => `@import "/styles/${name}.css";`).join('\n'), loader: 'css', resolveDir: publicDir }, external: ['/assets/*', '/media/*', '/uploads/*', '/fonts/*'] });
  const assets = [
    { extension: 'js', type: 'text/javascript', content: javascript.outputFiles[0].text },
    { extension: 'css', type: 'text/css', content: stylesheet.outputFiles[0].text }
  ].map((asset) => ({ ...asset, url: `/assets/site-${createHash('sha256').update(asset.content).digest('hex').slice(0, 20)}.${asset.extension}` }));
  return {
    assets,
    install(app) {
      for (const asset of assets) app.get(asset.url, (_req, res) => res.set('Cache-Control', 'public, max-age=31536000, immutable').type(asset.type).send(asset.content));
    },
    render(markup) {
      const document = load(markup);
      document('link[rel="stylesheet"][href^="/styles/"]').remove();
      document('head').append(`<link rel="stylesheet" href="${assets[1].url}" />`);
      document('script[src^="/scripts/app.js"]').attr('src', assets[0].url);
      return document.html();
    }
  };
};