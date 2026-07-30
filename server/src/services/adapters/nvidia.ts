import { OpenRouterAdapter } from "./openrouter.js";

/** NVIDIA NIM exposes an OpenAI-compatible text API. */
export class NvidiaAdapter extends OpenRouterAdapter {
  readonly slug = "nvidia";

  constructor(apiKey: string) {
    super(apiKey, "https://integrate.api.nvidia.com/v1");
  }

  override async listModels() {
    const models = await super.listModels();
    return models.map((model) => ({
      ...model,
      // NIM uses OpenAI-compatible catalog entries. Keep zero pricing and
      // explicit `free` catalogue labels instead of downgrading every entry
      // to UNKNOWN during discovery.
      isFree: model.isFree || /(^|[-_:/ ])free($|[-_:/ ])/i.test(`${model.slug} ${model.name}`),
      freeSource: model.isFree
        ? model.freeSource
        : /(^|[-_:/ ])free($|[-_:/ ])/i.test(`${model.slug} ${model.name}`)
          ? "NVIDIA catalog free label"
          : undefined,
    }));
  }
}
