import wasmModuleUrl from "./onnx-runtime.mjs?url";
import type { Profile, Job } from "./matching";
import { profileText, jobText, cosine } from "./matching";
let extractor: Promise<any> | null = null;
export async function semanticScores(
  profile: Profile,
  jobs: Job[],
  progress: (s: string) => void,
) {
  if (!extractor)
    extractor = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = "/models/";
      env.backends.onnx.wasm!.numThreads = 1;
      env.backends.onnx.wasm!.wasmPaths = {
        mjs: wasmModuleUrl,
        wasm: "/onnx/ort-wasm-simd-threaded.jsep.wasm",
      };
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        dtype: "q8",
        device: "wasm",
        progress_callback: (x: any) =>
          progress(
            x.status === "progress"
              ? `Loading AI model: ${Math.round(x.progress || 0)}%`
              : "Preparing the AI model…",
          ),
      });
    })();
  try {
    const pipe = await extractor;
    const output = await pipe([profileText(profile), ...jobs.map(jobText)], {
      pooling: "mean",
      normalize: true,
    });
    const vectors = output.tolist();
    return Object.fromEntries(
      jobs.map((j, i) => [j.id, cosine(vectors[0], vectors[i + 1])]),
    );
  } catch (e) {
    console.warn("MODEL_INIT", e instanceof Error ? e.message : String(e));
    extractor = null;
    throw e;
  }
}
