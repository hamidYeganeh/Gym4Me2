/** Personal details live here. Reference prices are examples, not a live offer. */
export const profile = {
  name: "Mahdi",
  brand: "MAHDI",
  role: "UI/UX Designer",
  email: "", // Set the real address to enable the email composer.
  location: "Independent designer · Working worldwide",
  intro: "I'm Mahdi, an independent designer working with founders who need a site or a product",
  description: "Web design, product interfaces and front-end build. Clear interfaces. Considered details.",
};

export const services = [
  { id: "landing-pages", title: "Landing pages", detail: "one offer", icon: "layout", price: "1,800", plan: "Sprint", time: "1–2 weeks", description: "A single page that explains one offer and asks for one action. Structure, copy edit, design and a hand-coded build that loads fast on a phone.", tags: ["Page structure", "Copy edit", "Responsive build"] },
  { id: "websites", title: "Websites", detail: "up to eight pages", icon: "globe", price: "4,900", plan: "Studio", time: "3–6 weeks", description: "Marketing sites of up to eight pages on a CMS your team can edit without calling me. Templates for the pages you will add next year.", tags: ["Sitemap", "CMS setup", "Search basics"] },
  { id: "product-design", title: "Product design", detail: "web apps", icon: "pen", price: "4,900", plan: "Studio", time: "4–6 weeks", description: "Flows and screens for web apps: onboarding, dashboards, settings and the parts people use every day. Tested with real users before build.", tags: ["User flows", "Prototype", "Usability test"] },
  { id: "mobile-apps", title: "Mobile apps", detail: "iOS and Android", icon: "phone", price: "4,900", plan: "Studio", time: "4–6 weeks", description: "iOS and Android interfaces that follow platform conventions where it helps, with a clickable prototype and specs your developers can read.", tags: ["iOS and Android", "Prototype", "Handoff specs"] },
  { id: "brand-systems", title: "Brand systems", detail: "small and usable", icon: "palette", price: "3,400", plan: "Studio", time: "4 weeks", description: "A small identity that holds up in product: logo, colour, type and a short guide with the rules that keep them consistent.", tags: ["Logo suite", "Colour and type", "Usage guide"] },
  { id: "logos", title: "Logos", detail: "screen first", icon: "hexagon", price: "1,400", plan: "Sprint", time: "2 weeks", description: "A wordmark and a symbol drawn for screens first, tested at favicon size, delivered in every format and colour you will need.", tags: ["Wordmark", "Symbol", "Favicon set"] },
  { id: "social-media", title: "Social media", detail: "launch kits", icon: "share", price: "900", plan: "Retainer", time: "1 week", description: "Templates for launch posts, product updates and quotes. Your team fills them in without breaking the layout or the type.", tags: ["Post templates", "Launch kit", "Cover images"] },
  { id: "digital-products", title: "Digital products", detail: "kits you sell", icon: "cube", price: "2,600", plan: "Retainer", time: "2 weeks", description: "UI kits, templates and guides you sell: designed, documented and packaged so buyers can use them on day one.", tags: ["UI kits", "Templates", "Product page"] },
  { id: "copywriting", title: "Copywriting", detail: "with the design", icon: "type", price: "600", plan: "Sprint", time: "1 week", description: "Headlines, page copy and microcopy written alongside the layout, not pasted in afterwards. Short sentences, one idea each.", tags: ["Headlines", "Page copy", "Microcopy"] },
] as const;

export const plans = [
  { name: "Sprint", duration: "2 weeks", price: "1,800", subtitle: "One clear goal. One focused sprint.", description: "For the landing page, identity or launch that needs to move.", features: ["One focused deliverable", "Design and responsive build", "Two rounds of refinements", "Everything ready to hand over"], featured: false },
  { name: "Studio", duration: "6 weeks", price: "4,900", subtitle: "The whole picture, considered.", description: "For a complete website, a product or a brand built to last.", features: ["A complete, agreed project scope", "Strategy, design and development", "Weekly progress and feedback", "Launch support and handover"], featured: true },
  { name: "Retainer", duration: "Monthly", price: "3,200", subtitle: "A designer in your corner.", description: "For teams with a steady flow of things to make better.", features: ["A shared, prioritised design queue", "One active request at a time", "Direct async communication", "A flexible monthly rhythm"], featured: false },
] as const;

export const process = [
  { title: "First, we talk.", text: "A short conversation about what you are building, who it is for and what needs to change. We agree on the scope before anything starts." },
  { title: "Make it make sense.", text: "Structure, sketches and a clear direction. We work out the important decisions on paper before spending time on the pixels." },
  { title: "Sweat the details.", text: "Design, prototype, refine. You see the work as it happens, with space for useful feedback at every milestone." },
  { title: "Put it in the world.", text: "A responsive build, a careful handover and a final check. Everything you need to keep moving after launch." },
] as const;
