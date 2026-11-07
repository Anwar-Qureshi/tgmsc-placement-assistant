import CandidateApp from "./candidate-app";
import {catalogData} from "@/lib/catalog";
export const dynamic="force-dynamic";
export default async function Page(){
  let catalog=null;
  try {catalog=await catalogData();}catch {/* Client offers a retry if the first read fails. */}
  return <CandidateApp initialCatalog={catalog}/>;
}
