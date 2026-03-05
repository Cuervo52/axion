export async function analyzeMatchScreenshot(base64Image: string) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server Error Response:", errorText);
      throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("No se pudo analizar la imagen. Intenta con una captura más clara.");
  }
}
