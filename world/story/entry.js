// Loaded only after the existing personal-world tester gate has succeeded.
// Capture keeps the old unavailable toast from handling the same button click.
const button=document.getElementById('commonButton');
if(button && !button.dataset.storyV1){
 button.dataset.storyV1='1';button.classList.remove('world-nav__disabled');
 button.removeAttribute('disabled');button.removeAttribute('aria-disabled');
 button.style.opacity='1';button.style.cursor='pointer';
 const caption=button.querySelector('small');if(caption){caption.removeAttribute('data-t');caption.textContent='V1 · ТЕСТ';}
 button.setAttribute('aria-label','Общий сюжетный мир — тест v1');
 button.addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  location.assign(new URL('../story-world.html?story_tester=1',document.baseURI).href);
 },{capture:true});
}
