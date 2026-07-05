import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("questions", "routes/questions.tsx"),
  route("questions/:id", "routes/question.tsx"),
] satisfies RouteConfig;
