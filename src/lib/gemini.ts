export async function generateChecklist(taskTitle: string, category: string) {
  try {
    const response = await fetch('/api/generate-checklist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskTitle, category }),
    });

    if (!response.ok) {
      throw new Error(`Checklist generation failed with ${response.status}`);
    }

    const items = await response.json();
    return items.map((item: any) => ({ title: item.title, completed: false }));
  } catch (error) {
    console.error("Gemini checklist generation failed", error);
    return [];
  }
}
