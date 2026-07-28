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
      // The public catalogue does not expose a reliable Free Endpoint flag.
      isFree: false,
      freeSource: "Requires administrator verification against NVIDIA API Catalog",
    }));
  }
}
