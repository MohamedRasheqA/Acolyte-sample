import { registerOTel } from "@vercel/otel";
import { AISDKExporter } from "langsmith/traceable";
export function register() {
  registerOTel({
    serviceName: "Teach Back: Drug-statistics",
    traceExporter: new AISDKExporter(),
  });
}