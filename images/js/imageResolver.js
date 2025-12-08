export function resolveImage(name){
  if(!name) return 'images/default.jpg';
  return 'images/' + name;
}
