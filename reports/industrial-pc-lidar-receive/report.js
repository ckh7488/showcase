const symptomDemo = document.getElementById('symptom-demo');
const symptomReplay = document.getElementById('symptom-replay');

symptomReplay.addEventListener('click', () => {
  symptomDemo.classList.remove('is-replaying');
  void symptomDemo.offsetWidth;
  symptomDemo.classList.add('is-replaying');
});
symptomReplay.hidden = false;

const debugTabList = document.querySelector('.debug-tabs');
const debugTabs = [...debugTabList.querySelectorAll('[role="tab"]')];
const debugPanels = debugTabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

function selectDebugTab(index) {
  debugTabs.forEach((tab, tabIndex) => {
    const selected = index === tabIndex;
    tab.setAttribute('aria-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
    debugPanels[tabIndex].toggleAttribute('inert', !selected);
  });
}

debugTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectDebugTab(index));
  tab.addEventListener('keydown', (event) => {
    let nextIndex;
    switch (event.key) {
      case 'ArrowLeft': nextIndex = (index + debugTabs.length - 1) % debugTabs.length; break;
      case 'ArrowRight': nextIndex = (index + 1) % debugTabs.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = debugTabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectDebugTab(nextIndex);
    debugTabs[nextIndex].focus({preventScroll: true});
  });
});
selectDebugTab(0);
debugTabList.hidden = false;
