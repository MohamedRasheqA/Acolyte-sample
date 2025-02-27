import { registerOTel } from "@vercel/otel";
import { AISDKExporter } from "langsmith/vercel";

export function register() {
  registerOTel({
    serviceName: "Drug-Pricing-Teach-Back",
    traceExporter: new AISDKExporter(),
  });
}