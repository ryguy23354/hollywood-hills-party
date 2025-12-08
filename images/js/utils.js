export function el(tag, attrs={}, children=[]){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
  children.forEach(c=> e.append(c));
  return e;
}
