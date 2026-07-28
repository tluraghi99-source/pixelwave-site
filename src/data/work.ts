export type TagVariant = "orange" | ""

export interface Project {
  id: string
  idx: string
  slug: string
  title: string
  desc: string
  client: string
  year: number
  tags: [TagVariant, string][]
}

// Temporary placeholder roster — swap in real client work as it's ready.
export const PROJECTS: Project[] = [
  {
    id: "pw-w1",
    idx: "01",
    slug: "northwind",
    title: "Northwind",
    desc: "Identity and site for a renewable-energy startup.",
    client: "Northwind Energy",
    year: 2025,
    tags: [
      ["orange", "Featured"],
      ["", "Web"],
      ["", "Brand"],
    ],
  },
  {
    id: "pw-w2",
    idx: "02",
    slug: "tidal-commerce",
    title: "Tidal Commerce",
    desc: "A storefront that moves — fluid product reveals.",
    client: "Tidal Commerce",
    year: 2025,
    tags: [
      ["", "Motion"],
      ["", "Dev"],
    ],
  },
  {
    id: "pw-w3",
    idx: "03",
    slug: "solstice",
    title: "Solstice",
    desc: "Editorial platform for a culture magazine.",
    client: "Solstice Magazine",
    year: 2024,
    tags: [
      ["", "Web"],
      ["", "CMS"],
    ],
  },
  {
    id: "pw-w4",
    idx: "04",
    slug: "meridian-bank",
    title: "Meridian Bank",
    desc: "Digital banking platform redesigned for clarity and trust.",
    client: "Meridian Bank",
    year: 2024,
    tags: [
      ["", "Web"],
      ["", "UX"],
    ],
  },
  {
    id: "pw-w5",
    idx: "05",
    slug: "glasswing",
    title: "Glasswing",
    desc: "Brand system and packaging for a specialty coffee roaster.",
    client: "Glasswing Coffee",
    year: 2023,
    tags: [
      ["orange", "Featured"],
      ["", "Brand"],
      ["", "Packaging"],
    ],
  },
  {
    id: "pw-w6",
    idx: "06",
    slug: "nightfall-records",
    title: "Nightfall Records",
    desc: "Motion-first site for an independent record label.",
    client: "Nightfall Records",
    year: 2023,
    tags: [
      ["", "Motion"],
      ["", "Web"],
    ],
  },
  {
    id: "pw-w7",
    idx: "07",
    slug: "arclight-studios",
    title: "Arclight Studios",
    desc: "Portfolio and booking platform for a film production house.",
    client: "Arclight Studios",
    year: 2022,
    tags: [
      ["", "Web"],
      ["", "Dev"],
    ],
  },
  {
    id: "pw-w8",
    idx: "08",
    slug: "halcyon-health",
    title: "Halcyon Health",
    desc: "Telehealth product design and front-end build.",
    client: "Halcyon Health",
    year: 2022,
    tags: [
      ["", "UX"],
      ["", "Dev"],
    ],
  },
  {
    id: "pw-w9",
    idx: "09",
    slug: "driftwood-market",
    title: "Driftwood Market",
    desc: "E-commerce experience for a coastal home goods brand.",
    client: "Driftwood Market",
    year: 2021,
    tags: [
      ["orange", "Featured"],
      ["", "Web"],
      ["", "CMS"],
    ],
  },
  {
    id: "pw-w10",
    idx: "10",
    slug: "vantage-analytics",
    title: "Vantage Analytics",
    desc: "Data dashboard design system for an enterprise SaaS.",
    client: "Vantage Analytics",
    year: 2021,
    tags: [
      ["", "UX"],
      ["", "Design System"],
    ],
  },
]
