import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProductsTool from "./tools/list-products";
import listCategoriesTool from "./tools/list-categories";
import listOrdersTool from "./tools/list-orders";
import getOrderDetailsTool from "./tools/get-order-details";
import listTablesTool from "./tools/list-tables";
import getRestaurantProfileTool from "./tools/get-restaurant-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pubfy-mcp",
  title: "Pubfy",
  version: "0.1.0",
  instructions:
    "Ferramentas do Pubfy para restaurantes. Use-as para consultar produtos, categorias, pedidos, mesas e perfil do restaurante do usuário autenticado. Todos os dados são filtrados pelo restaurante vinculado ao usuário via RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProductsTool,
    listCategoriesTool,
    listOrdersTool,
    getOrderDetailsTool,
    listTablesTool,
    getRestaurantProfileTool,
  ],
});
