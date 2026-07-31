import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PHONE = '609-200-5818';
const EMAIL = 'jmullen@mullenanalytics.com';
const BOOKING_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

function loadJson(relativePath) {
  try {
    const fullPath = path.join(process.cwd(), 'src', 'data', relativePath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function simpleSearchFaq(faq, query) {
  if (!query) return [];
  const q = query.toLowerCase();
  return faq
    .map((item) => ({
      item,
      score:
        (item.question || '').toLowerCase().includes(q) ||
        (item.answer || '').toLowerCase().includes(q)
          ? 1
          : 0,
    }))
    .filter((x) => x.score > 0)
    .map((x) => x.item)
    .slice(0, 5);
}

function buildContext({ faqMatches, services, serviceDetails }) {
  let context = '';

  if (services && services.length) {
    context += 'Services offered by Mullen Analytics & Data Solutions LLC:\n';
    for (const s of services) {
      context += `- ${s.name}: ${s.shortDescription || s.description || ''}\n`;
    }
    context += '\n';
  }

  if (serviceDetails && serviceDetails.length) {
    context += 'Service details:\n';
    for (const d of serviceDetails.slice(0, 5)) {
      context += `- ${d.title || d.name || ''}: ${d.description || ''}\n`;
    }
    context += '\n';
  }

  if (faqMatches && faqMatches.length) {
    context += 'Relevant FAQs:\n';
    for (const f of faqMatches) {
      context += `Q: ${f.question}\nA: ${f.answer}\n\n`;
    }
  }

  return context.trim();
}

async function callOpenAI(messages, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      role: 'assistant',
      content:
        'Our assistant is currently unavailable because the OpenAI API key is not configured. Please contact us at 609-200-5818 or jmullen@mullenanalytics.com.',
    };
  }

  const systemPrompt = `You are the customer assistant for Mullen Analytics & Data Solutions LLC.\n\nYour goals:\n- Explain what the company does in clear language.\n- Provide contact info: Phone ${PHONE}, Email ${EMAIL}.\n- Direct users to schedule a call at: ${BOOKING_URL}.\n- Only talk about services that are in the provided documents or context.\n- If you do not know the answer from the context, say you are not sure and that James will follow up.\n- Style: friendly, professional, concise, realistic (do not overpromise).\n- Always stay on-brand and use the name "Mullen Analytics & Data Solutions LLC".\n\nHere is some reference information about the company, services, and FAQs:\n${context}`;

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error('OpenAI error', await resp.text());
    return {
      role: 'assistant',
      content:
        'Sorry, I am having trouble accessing my assistant tools right now. Please call 609-200-5818 or email jmullen@mullenanalytics.com.',
    };
  }

  const json = await resp.json();
  const choice = json.choices && json.choices[0];
  return choice?.message || { role: 'assistant', content: 'Sorry, something went wrong.' };
}

function appendLog(entry) {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    const logPath = path.join(logsDir, 'chat.log');
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('Failed to write log', e);
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { messages = [], pageUrl } = body;

  const userMessage = Array.isArray(messages)
    ? messages.filter((m) => m.role === 'user').slice(-1)[0]
    : null;

  const faq = loadJson('faq.json');
  const services = loadJson('services.json');
  const serviceDetails = loadJson('serviceDetails.json');

  const faqMatches = userMessage ? simpleSearchFaq(faq, userMessage.content || '') : [];
  const context = buildContext({ faqMatches, services, serviceDetails });

  const assistantMessage = await callOpenAI(messages, context);

  appendLog({
    timestamp: new Date().toISOString(),
    pageUrl: pageUrl || null,
    messages,
    assistantMessage,
  });

  return NextResponse.json({ assistantMessage });
}
