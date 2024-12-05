// ==UserScript==
// @name         Futsal Lineup builder (json)
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Intercept a click and log the HTML code at the clicked location
// @author       You
// @match        https://futsal.com.ua/*
// @grant        none
// ==/UserScript==


const htmlString = `<div style="position: fixed; top: 0; right: 0; background-color: rgba(55, 55, 255, 0.75); color: white; padding: 5px; z-index: 10000; font-weight: bold; border: 1px solid  rgb(55, 55, 255);">
  <div>
    <div>Starter 5 (<span>0</span> selected)</div>
    <div id="starter5InjId" style="background-color: rgba(55, 55, 255, 0.5); padding: 5px; font-size: 0.7em; color: lightgreen; cursor: move;"></div>
  </div>
  <p></p>
  <div>
    <div>Bench players (<span>0</span> selected)</div>
    <div id="benchPlayersInjId" style="background-color: rgba(55, 55, 255, 0.5); padding: 5px; font-size: 0.7em; color: lightpink; cursor: move;"></div>
  </div>
</div>`;

// Parse the HTML string using DOMParser
const doc = new DOMParser().parseFromString(htmlString, 'text/html');

// Get the div element from the parsed document
const new_div = doc.body.firstElementChild;
const starter5_injected_node = new_div.querySelector('#starter5InjId');
const bench_players_injected_node = new_div.querySelector('#benchPlayersInjId');

class PlayersList {
    constructor(pln, plml, rbgc) {
        this.playersListNode = pln;
        this.playersListMaxLength = plml;
        this.rowBgColor = rbgc;
    }

    get actualListLength() { return this.playersListNode.querySelectorAll(':scope > div').length }
    playerExists(player_str) {
        return Array.from(this.playersListNode.querySelectorAll(':scope > div')).some(playerDiv => {
            console.log(player_str, playerDiv.innerText);
            return playerDiv.innerText.includes(player_str);
                                                                                                   } )
                             }
    playerDiv(playerNumWithName) { return Array.from(this.playersListNode.querySelectorAll(':scope > div')).find( element => element.innerText.trim() === playerNumWithName ) }
}

const players_lists = []; // 1 - true: starter5, 0 - false: benchPlayers
players_lists[1] = new PlayersList(starter5_injected_node, 5, 'lightgreen');
players_lists[0] = new PlayersList(bench_players_injected_node, 9, 'lightpink');

let draggedItem = null;

document.body.appendChild(new_div); // Append the div to the body

const observerCallbackPlayersListChanged = (mutationsList, observer) => {
  for (let mutation of mutationsList) {
    if (mutation.type === 'childList') {
      mutation.target.previousElementSibling.querySelector('span').innerHTML = mutation.target.querySelectorAll(':scope > div').length;
    } else if (mutation.type === 'attributes') {
      console.log('Child nodes attributes were added or removed');
    }
  }
}; // Create a MutationObserver callback function

const observerConfigForPlayersList = {
  childList: true,    // Detect changes to child nodes
  subtree: true,      // Detect changes in all descendant nodes
  attributes: true,   // Detect attribute changes (e.g., class, style)
  characterData: true // Detect changes to text content
}; // Set up the observer configuration

const observerForPlayersList = new MutationObserver(observerCallbackPlayersListChanged); // Create and start observing the parent node

players_lists.forEach((playersListObj) => {
    // console.log(playersListObj);
    observerForPlayersList.observe(playersListObj.playersListNode, observerConfigForPlayersList);
    // To stop observing all nodes
    //observer.disconnect();
    // To stop observing a specific node (if needed in future)
    //observer.unobserve(parentNode1);

    playersListObj.playersListNode.addEventListener('dragstart', (event) => {
        draggedItem = event.target;
        draggedItem.classList.add('dragging');
    });

    playersListObj.playersListNode.addEventListener('dragend', (event) => {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    });

   playersListObj.playersListNode.addEventListener('dragover', (event) => {
        event.preventDefault();
        const draggingOverItem = event.target.closest('div[draggable]');
        if (playersListObj.actualListLength < playersListObj.playersListMaxLength) {
            if (draggingOverItem && draggingOverItem !== draggedItem) {
                const bounding = draggingOverItem.getBoundingClientRect();
                const offset = event.clientY - bounding.top;
                const midpoint = bounding.height / 2;
                if (offset > midpoint) {
                    draggingOverItem.after(draggedItem);
                } else {
                    draggingOverItem.before(draggedItem);
                }
            }
        } else {
            blink_text(playersListObj.playersListNode.previousElementSibling);
        }
    });

    playersListObj.playersListNode.addEventListener('drop', (event) => {
        event.preventDefault(); // Prevent default action
        draggedItem.__data.style.backgroundColor = playersListObj.rowBgColor;
    });
}); // define all event listeners

function blink_text(text) {
  if (text.dataset.blinking === 'true') return; // Check if blinking is already active for this text node
  text.dataset.blinking = 'true'; // Mark the text node as blinking

  // Start the blinking effect
  const blinkInterval = setInterval(() => {
      text.style.color = text.style.color == 'red' ? 'white' : 'red';
  }, 100); // Blinking interval (ms)

  // Stop blinking after 2 seconds
  setTimeout(() => {
    clearInterval(blinkInterval); // Stops the interval
    text.style.color = 'white';
    text.dataset.blinking = 'false'; // Reset the blinking state
  }, 2000); // Duration for blinking (ms)
}

function remove_player(playersListObj, playerNumWithName) {
    const playerDiv = playersListObj.playerDiv(playerNumWithName);
    if (playerDiv) {
        // Remove the sub-array at the found index
        playerDiv.__data.style.removeProperty('background-color');
        playerDiv.remove();
    }
}

function add_player(playerListObj, playerStr, clickedRow) {
    if ( players_lists[0].playerExists(playerStr) || players_lists[1].playerExists(playerStr) ) {
         remove_player(playerListObj.playersListNode, playerStr) // event.target.innerHTML
    } else {
        if ( playerListObj.actualListLength < playerListObj.playersListMaxLength ) {
            const newDivElement = document.createElement("div");
            newDivElement.draggable = true;
            newDivElement.__data = clickedRow;
            newDivElement.innerHTML = playerStr;
            playerListObj.playersListNode.appendChild(newDivElement);
            clickedRow.style.backgroundColor = playerListObj.rowBgColor;
        } else {
            blink_text(playerListObj.playersListNode.previousElementSibling)
        }
    }
}


// main listener (click on document)
(function() {
    'use strict';
    document.addEventListener('click', function(event) {
        // Get the HTML element at the clicked position
        const clicked_row = event.target.closest('tr');
        if (clicked_row) {
            const nameElement = clicked_row.querySelector('.data-name');
            if (nameElement) {
                // click inside player row
                const playerName = nameElement.textContent.trim();
                const player_num_with_name = clicked_row.firstChild.innerHTML.padStart(2, ' ') + "    " + playerName;
                add_player(players_lists[Number(event.ctrlKey)], player_num_with_name, clicked_row);
            }
        } else {
            // click outside player row
            if (event.target.closest('#starter5InjId')) remove_player(players_lists[1], event.target.innerHTML); // click inside starter5InjectedNode
            if (event.target.closest('#benchPlayersInjId')) remove_player(players_lists[0], event.target.innerHTML); // click inside benchPlayersInjectedNode
        }
    });
})();
