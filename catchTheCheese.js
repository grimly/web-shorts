import { concat, fromEvent, map, of } from "https://esm.sh/rxjs@7.8.1";

const playground = document.getElementById("playground");

const cheese = document.getElementById("cheese");

function nextPosition() {
  const {height: playgroundHeight, width: playgroundWidth} = playground.getBoundingClientRect();
  const {height: cheeseHeight, width: cheeseWidth} = cheese.getBoundingClientRect();
  return {
    x: Math.floor(Math.random() * (playgroundWidth - cheeseWidth)),
    y: Math.floor(Math.random() * (playgroundHeight - cheeseHeight)),
  };
}


concat(
  of(undefined),
  fromEvent(cheese, "mouseenter")
)
  .pipe(
    map(nextPosition)
  )
  .subscribe(({x, y}) => {
    cheese.classList.remove("d-none");
    cheese.style.top = `${y}px`;
    cheese.style.left = `${x}px`;
  });