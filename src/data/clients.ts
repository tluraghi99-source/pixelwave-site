import inter from "@/assets/clients/inter.svg"
import adidas from "@/assets/clients/adidas.svg"
import redbull from "@/assets/clients/redbull.svg"
import miglia1000 from "@/assets/clients/1000miglia.svg"
import ford from "@/assets/clients/ford.svg"
import quattroruote from "@/assets/clients/quattroruote.svg"
import menshealth from "@/assets/clients/menshealth.svg"
import deejay from "@/assets/clients/deejay.svg"
import milanocortina2026 from "@/assets/clients/milanocortina2026.svg"
import campari from "@/assets/clients/campari.svg"
import marelli from "@/assets/clients/marelli.svg"
import nike from "@/assets/clients/nike.svg"
import bnpparibas from "@/assets/clients/bnpparibas.svg"
import maserati from "@/assets/clients/maserati.svg"
import satispay from "@/assets/clients/satispay.svg"
import cocacola from "@/assets/clients/cocacola.svg"
import unicredit from "@/assets/clients/unicredit.svg"
import generali from "@/assets/clients/generali.svg"
import allianz from "@/assets/clients/allianz.svg"

export interface Client {
  name: string
  /** Real logo file, sourced from Wikimedia Commons — undefined for clients
   *  with no clean asset available yet, which fall back to a text
   *  logotype instead (see ClientLogos.tsx). */
  logo?: string
  /** Most logos render as flat black (see .client-logos__item's filter) so
   *  the wall reads as one consistent mark instead of a rainbow of brand
   *  colors. A few — like Inter's crest — are two-tone-on-a-solid-fill
   *  (white detail reversed out of a colored background) and turn into an
   *  unrecognizable black blob under that filter, so they keep their real
   *  colors instead. */
  keepColor?: boolean
}

export const CLIENTS: Client[] = [
  { name: "Inter", logo: inter, keepColor: true },
  { name: "Adidas", logo: adidas },
  { name: "Red Bull", logo: redbull },
  { name: "Style Magazine" },
  { name: "1000 Miglia", logo: miglia1000 },
  { name: "Gattinoni Group" },
  { name: "Ford", logo: ford },
  { name: "ABmedica" },
  { name: "Snakes Milano" },
  { name: "Quattroruote", logo: quattroruote },
  { name: "L'Isola del Gusto" },
  { name: "Men's Health", logo: menshealth },
  { name: "Deejay", logo: deejay },
  { name: "STS Communication" },
  { name: "Milano Cortina 2026", logo: milanocortina2026 },
  { name: "Campari", logo: campari },
  { name: "Marelli", logo: marelli },
  { name: "Nike", logo: nike },
  { name: "BNP Paribas", logo: bnpparibas },
  { name: "Alfa Romeo" },
  { name: "Maserati", logo: maserati },
  { name: "Satispay", logo: satispay },
  { name: "Coca-Cola", logo: cocacola },
  { name: "UniCredit Bank", logo: unicredit },
  { name: "Generali", logo: generali },
  { name: "immobiliare.it" },
  { name: "Allianz", logo: allianz },
]
