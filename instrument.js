import { registerOTel } from "@vercel/otel";
import { AISDKExporter } from "langsmith/vercel";
export function register() {
  registerOTel({
    serviceName: "Teach Back: Drug-statistics",
    traceExporter: new AISDKExporter(),
  });
}