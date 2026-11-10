
const wallExample = document.getElementById('wall-example');
const wallOffset = document.getElementById('wall-offset');
const wallOffsetValue = document.getElementById('wall-offset-value');
const wallAngle = document.getElementById('wall-angle');
const wallPoints = document.getElementById('wall-points');
const wallReset = document.getElementById('wall-reset');
const rotorDegreesPerMillisecond = 36 * 360 / 60000;
const signedNumber = new Intl.NumberFormat('ko-KR', { signDisplay: 'exceptZero', maximumFractionDigits: 1 });

function updateWallExample() {
  const offset = wallOffset.valueAsNumber;
  const angle = offset * rotorDegreesPerMillisecond;
  const offsetText = `${signedNumber.format(offset)} ms`;
  wallOffsetValue.value = offsetText;
  wallOffset.setAttribute('aria-valuetext', offsetText);
  wallAngle.value = `${signedNumber.format(angle)}°`;
  wallPoints.setAttribute('transform', `rotate(${angle} 105 126)`);
  wallExample.classList.toggle('shifted', offset !== 0);
}

wallOffset.addEventListener('input', updateWallExample);
wallReset.addEventListener('click', () => {
  wallOffset.value = '0';
  updateWallExample();
});
updateWallExample();

const resetPicker = document.getElementById('reset-picker');
const resetPanels = document.querySelectorAll('[data-case]');

resetPicker.addEventListener('change', (event) => {
  for (const panel of resetPanels) {
    panel.hidden = panel.dataset.case !== event.target.value;
  }
});
