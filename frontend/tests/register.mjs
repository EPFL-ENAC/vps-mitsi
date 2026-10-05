import * as module from 'node:module';
import { resolve, load } from './typescript-loader.mjs';

if (module.registerHooks) {
    module.registerHooks({ resolve, load });
} else {
    // Node 20 predates synchronous module hooks.
    module.register('./typescript-loader.mjs', import.meta.url);
}
