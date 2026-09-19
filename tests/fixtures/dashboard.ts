import {
  defaultSettings,
  type Dashboard,
  type Message,
} from "../../shared/contracts";
const org = "demo-workspace";
const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString();
export const demoData: Dashboard = {
  organization: { id: org, name: "Bloom & Co." },
  role: "owner",
  business: {
    name: "Bloom & Co.",
    category: "Flowers & thoughtful gifts",
    description:
      "A little joy, delivered. Thoughtfully arranged flowers and gifts for everyday moments and extraordinary occasions.",
    location: "Makati City, Metro Manila",
    contact: "hello@bloomandco.example",
    hours: "Monday–Saturday, 9:00 AM–6:00 PM",
    delivery:
      "Same-day delivery across Metro Manila for orders confirmed before 2 PM. Delivery fee: ₱150.",
    payments: "GCash, bank transfer, and credit card",
    policies:
      "Contact our team for concerns about your order. Custom arrangements require 24 hours notice.",
  },
  settings: { ...defaultSettings, bot_name: "Bloom assistant" },
  accounts: [
    {
      id: "fb",
      organization_id: org,
      external_id: "demo-fb",
      platform: "facebook",
      name: "Bloom & Co.",
      connected: true,
    },
    {
      id: "ig",
      organization_id: org,
      external_id: "demo-ig",
      platform: "instagram",
      name: "bloomandco.ph",
      connected: true,
    },
  ],
  knowledge: [
    {
      id: "k1",
      organization_id: org,
      kind: "product",
      title: "The Everyday Bouquet",
      content:
        "A seasonal mix of fresh blooms, wrapped with care. ₱850 per bouquet. Ask our team to confirm availability.",
      verified: true,
    },
    {
      id: "k2",
      organization_id: org,
      kind: "faq",
      title: "Do you offer same-day delivery?",
      content:
        "Yes! Same-day delivery is available across Metro Manila for orders confirmed before 2 PM. Delivery fee: ₱150.",
      verified: true,
    },
    {
      id: "k3",
      organization_id: org,
      kind: "product",
      title: "The Sunday Arrangement",
      content:
        "A generous arrangement of roses, lisianthus, and seasonal greens. ₱1,650. Vase included.",
      verified: true,
    },
    {
      id: "k4",
      organization_id: org,
      kind: "policy",
      title: "Custom arrangements",
      content:
        "Made just for you. Please contact our team at least 24 hours ahead to discuss your custom arrangement.",
      verified: true,
    },
  ],
  automations: [
    {
      id: "a1",
      organization_id: org,
      name: "A warm first hello",
      keywords: ["hello", "hi", "hey"],
      reply:
        "Hi there! Welcome to Bloom & Co. 🌷 Looking for something special? We’re happy to help.",
      enabled: true,
      priority: 10,
      uses: 248,
    },
    {
      id: "a2",
      organization_id: org,
      name: "Delivery, sorted",
      keywords: ["delivery", "shipping"],
      reply:
        "We deliver across Metro Manila for ₱150. Confirm your order before 2 PM for same-day delivery!",
      enabled: true,
      priority: 20,
      uses: 184,
    },
    {
      id: "a3",
      organization_id: org,
      name: "Ways to pay",
      keywords: ["payment", "gcash"],
      reply:
        "We accept GCash, bank transfer, and credit card. Our team can help you complete your order.",
      enabled: true,
      priority: 30,
      uses: 96,
    },
    {
      id: "a4",
      organization_id: org,
      name: "After-hours welcome",
      keywords: ["opening hours", "open today"],
      reply:
        "Our studio is open Monday–Saturday, 9 AM–6 PM. Leave us a message and we’ll be right with you.",
      enabled: false,
      priority: 40,
      uses: 42,
    },
  ],
  conversations: [
    {
      id: "c1",
      customer_name: "Sofia Reyes",
      platform: "instagram",
      status: "open",
      last_message: "That sounds perfect! Do you have it in pink?",
      minutes: 2,
    },
    {
      id: "c2",
      customer_name: "Miguel Santos",
      platform: "facebook",
      status: "human",
      last_message: "Can I speak with someone about my order?",
      minutes: 8,
    },
    {
      id: "c3",
      customer_name: "Isabella Cruz",
      platform: "instagram",
      status: "open",
      last_message: "Hi! How much is the Sunday arrangement?",
      minutes: 14,
    },
    {
      id: "c4",
      customer_name: "Daniel Garcia",
      platform: "facebook",
      status: "resolved",
      last_message: "Thank you so much. She loved the flowers! 🌸",
      minutes: 27,
    },
    {
      id: "c5",
      customer_name: "Amara Lim",
      platform: "instagram",
      status: "open",
      last_message: "Do you deliver to BGC?",
      minutes: 36,
    },
    {
      id: "c6",
      customer_name: "Lucas Tan",
      platform: "facebook",
      status: "human",
      last_message: "I’d like to arrange flowers for our event.",
      minutes: 54,
    },
  ].map((c) => ({
    ...c,
    organization_id: org,
    customer_id: `customer-${c.id}`,
    social_account_id: c.platform === "facebook" ? "fb" : "ig",
    created_at: ago(c.minutes + 50),
    updated_at: ago(c.minutes),
    last_incoming_at: ago(c.minutes),
    assigned_to: null,
    is_test: false,
  })) as Dashboard["conversations"],
  drafts: [
    {
      id: "d1",
      organization_id: org,
      kind: "post",
      title: "A little joy for your feed",
      content:
        "Some days just need flowers. 🌷 A thoughtfully gathered bouquet, a handwritten note, a little reminder that someone cares. Discover your next everyday moment with Bloom & Co. #BloomAndCo #EverydayJoy",
      status: "approved",
      platform: "instagram",
      scheduled_at: null,
      social_account_id: "ig",
      image_url: null,
      ai_generated: true,
      created_at: ago(180),
    },
    {
      id: "d2",
      organization_id: org,
      kind: "post",
      title: "Fresh blooms, fresh week",
      content:
        "A fresh week deserves fresh flowers. Meet The Everyday Bouquet — seasonal blooms, wrapped with care, for ₱850. Send us a message to make someone’s day.",
      status: "draft",
      platform: "facebook",
      scheduled_at: null,
      social_account_id: "fb",
      image_url: null,
      ai_generated: true,
      created_at: ago(1440),
    },
  ],
  usage: Array.from({ length: 14 }, (_, i) => ({
    id: `u${i}`,
    organization_id: org,
    model: "demo",
    provider: "sample",
    input_tokens: 1100 + i * 24,
    output_tokens: 180 + i * 11,
    total_tokens: 1280 + i * 35,
    estimated_cost: 0.0012,
    request_status: "completed",
    latency_ms: 750 + i * 80,
    is_test: false,
    created_at: ago(i * 720),
  })),
  members: [
    {
      user_id: "m1",
      organization_id: org,
      role: "owner",
      display_name: "Alex Morgan",
    },
    {
      user_id: "m2",
      organization_id: org,
      role: "admin",
      display_name: "Jamie Rivera",
    },
    {
      user_id: "m3",
      organization_id: org,
      role: "agent",
      display_name: "Sam Chen",
    },
  ],
  notifications: [
    {
      id: "n1",
      organization_id: org,
      conversation_id: "c2",
      message: "Miguel Santos would like to speak with your team.",
      read: false,
      created_at: ago(8),
    },
    {
      id: "n2",
      organization_id: org,
      conversation_id: "c6",
      message: "Lucas Tan needs help with an event arrangement.",
      read: false,
      created_at: ago(54),
    },
  ],
};
export function initialMessages(conversationId: string): Message[] {
  const c = demoData.conversations.find((c) => c.id === conversationId)!;
  return [
    {
      id: `${c.id}-1`,
      organization_id: org,
      conversation_id: c.id,
      direction: "inbound",
      source: "customer",
      text:
        c.id === "c1"
          ? "Hi! I’m looking for a bouquet for my mom’s birthday."
          : "Hi there! I have a question.",
      created_at: ago(60),
      delivery_status: "received",
    },
    {
      id: `${c.id}-2`,
      organization_id: org,
      conversation_id: c.id,
      direction: "outbound",
      source: "ai",
      text:
        c.id === "c1"
          ? "What a lovely thought! Our Everyday Bouquet is a seasonal mix of fresh blooms, wrapped with care, for ₱850. Would you like to know more?"
          : "Welcome to Bloom & Co.! How can we help you today?",
      created_at: ago(59),
      delivery_status: "sent",
    },
    {
      id: `${c.id}-3`,
      organization_id: org,
      conversation_id: c.id,
      direction: "inbound",
      source: "customer",
      text: c.last_message,
      created_at: c.updated_at,
      delivery_status: "received",
    },
  ];
}
