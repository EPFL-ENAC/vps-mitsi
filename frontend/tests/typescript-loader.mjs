// Run the application's TypeScript in Node's test runner on Node 20+ without
// another test framework. Typechecking remains the responsibility of vue-tsc.
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { parse, compileScript } from 'vue/compiler-sfc';

export function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('src/')) {
        const path = /\.(ts|vue)$/.test(specifier) ? specifier : `${specifier}.ts`;
        return nextResolve(new URL(`../${path}`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
    if (/\.(ts|vue)$/.test(url) && !url.includes('/node_modules/')) {
        let source = readFileSync(new URL(url), 'utf8');
        if (url.endsWith('.vue')) {
            const { descriptor } = parse(source, { filename: url });
            source = compileScript(descriptor, { id: url, inlineTemplate: true }).content;
        }
        // Match Vite's public base URL when rendering layouts in Node.
        source = source.replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
        return {
            format: 'module',
            source: ts.transpileModule(source, {
                compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
            }).outputText,
            shortCircuit: true,
        };
    }
    return nextLoad(url, context);
}
