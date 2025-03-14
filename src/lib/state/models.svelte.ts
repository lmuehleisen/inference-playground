import { page } from "$app/state";
import type { ModelWithTokenizer } from "$lib/types.js";

export const models = $derived({ current: page.data.models as ModelWithTokenizer[] });
