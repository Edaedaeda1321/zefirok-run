// Loaded only after the existing personal-world tester gate has succeeded.
// Capture keeps the old unavailable toast from handling the same button click.
const button=document.getElementById('commonButton');
if(button && !button.dataset.storyV1){
 button.dataset.storyV1='1';button.classList.remove('world-nav__disabled');
 button.removeAttribute('disabled');button.removeAttribute('aria-disabled');
 button.style.opacity='1';button.style.cursor='pointer';
 const caption=button.querySelector('small');if(caption){caption.removeAttribute('data-t');caption.textContent='';}
 button.setAttribute('aria-label','Открыть общий город');
 button.addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(window.parent!==window)window.parent.postMessage({type:'zefirok-world-switch',view:'story'},location.origin);
  else location.assign(new URL('../story-world.html',document.baseURI).href);
 },{capture:true});
}
