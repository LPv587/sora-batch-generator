export function parseCsv(text: string): string[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const prompts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      prompts.push(trimmed.slice(1, -1));
    } else {
      prompts.push(trimmed);
    }
  }

  if (prompts.length > 0 && /^(prompt|提示词|text)/i.test(prompts[0])) {
    prompts.shift();
  }

  return prompts.filter(p => p);
}

export function toCsv(prompts: string[]): string {
  const header = '提示词';
  const rows = prompts.map(p => `"${p.replace(/"/g, '""')}"`);
  return [header, ...rows].join('\n');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
