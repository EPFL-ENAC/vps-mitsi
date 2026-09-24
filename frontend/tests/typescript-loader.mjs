// Run the application's TypeScript in Node's test runner on Node 20+ without
// another test framework. Typechecking remains the responsibility of vue-tsc.
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('src/')) {
        return nextResolve(new URL(`../${specifier}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
    if (url.endsWith('.ts') && !url.includes('/node_modules/')) {
        const source = readFileSync(new URL(url), 'utf8');
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
