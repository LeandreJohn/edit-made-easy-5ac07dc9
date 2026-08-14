import { createFileRoute } from "@tanstack/react-router";
import CareerSourcing from "@/pages/CareerSourcing";

export const Route = createFileRoute("/career-sourcing/$hearfrom")({
  component: CareerSourcing,
});
