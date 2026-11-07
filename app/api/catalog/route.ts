import { json } from "@/lib/server";
import { catalogData } from "@/lib/catalog";
export async function GET() {
  try {return json(await catalogData());}
  catch {return json({error:"The drive list is unavailable. Please try again."},503);}
}
