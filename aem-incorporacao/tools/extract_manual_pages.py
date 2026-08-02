from pathlib import Path
import fitz

PDF = Path(r"C:\Users\104535mtat\Downloads\G3581-90001.pdf")
OUT = Path(r"F:\.FlowCore Solutions\Site FlowCore Solutions\60_PROJETOS\A&M incorporação\work\manual_pages")
OUT.mkdir(parents=True, exist_ok=True)

doc = fitz.open(PDF)
for page_no in [17, 18, 21, 33, 40, 41, 46, 48, 127, 128]:
    page = doc[page_no - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
    pix.save(OUT / f"manual_p{page_no}.png")
