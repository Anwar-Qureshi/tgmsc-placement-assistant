function requireText(text: string) {
  if (text.trim().length < 30)
    throw Error(
      "Very little text was found. Please enter your details manually or try a different resume.",
    );
  return text.slice(0, 30000);
}
export async function resumeText(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw Error("Choose a file smaller than 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt") return requireText(await file.text());
  if (extension === "docx") {
    const { default: mammoth } = await import("mammoth/mammoth.browser.js");
    return requireText(
      (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }))
        .value,
    );
  }
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
    }).promise;
    try {
      if (pdf.numPages > 12) throw Error("Use a resume of 12 pages or fewer.");
      let text = "";
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((i: any) => (i.str || "") + (i.hasEOL ? "\n" : ""))
            .join(" ") + "\n";
      }
      if (text.trim().length < 30)
        throw Error(
          "This PDF may be scanned. Please enter your details manually or upload a text PDF.",
        );
      return text.slice(0, 30000);
    } finally {
      await pdf.destroy();
    }
  }
  throw Error(
    "Use a text PDF, DOCX or TXT file, or enter your details manually.",
  );
}
