(function(){
  const links = document.querySelectorAll('.link');
  const nodes = document.querySelectorAll('.node');
  nodes.forEach((n, idx)=>{
    n.addEventListener('mouseenter', ()=>{
      links[idx] && links[idx].setAttribute('stroke-dasharray', '');
    });
    n.addEventListener('mouseleave', ()=>{
      links[idx] && links[idx].setAttribute('stroke-dasharray', '6 6');
    });
  });
})();
