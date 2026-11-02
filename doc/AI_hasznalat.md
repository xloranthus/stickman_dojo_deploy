
# AI használat, promptok dokumentációja

## Kishalmi Levente

### ArenaRenderer.ts

> A `OVRT_Stickman_Dojo.pdf` View fejezete és a `src/frontend/src/controller/README.md` alapján valósítsd meg a `src/frontend/src/view/ArenaRenderer.ts` osztályt. A renderer csak rajzoljon, a pálya- és platformadatokat ne módosítsa. Legyen `draw(ctx, platforms)` metódusa, amely kirajzolja a canvas hátterét, a talajt és a levegőben lévő platformokat. A platformokhoz használj olvasható, csak olvasható `x`, `y`, `width`, `height` adattagokat. Ellenőrizd a hibás koordinátákat és méreteket, és hibás bemenetre adj egyértelmű hibát. Kövesd a projekt TypeScript-konvencióit.

### FighterRenderer.ts

> Valósítsd meg a `src/frontend/src/view/FighterRenderer.ts` fájlt a PDF View-fejezete és a controller README bekötési mintája szerint. A fájlnév `FighterRenderer.ts`, ez a View harcosrajzolója; a `model/Fighter.ts`-t ne módosítsd. A `draw(fighter, ctx)` a harcos adatait csak olvassa, és a canvasra rajzolja a nevet, színnel jelölt stickman figurát, valamint az állapotának megfelelő álló, támadó vagy blokkoló pózt. A controller `ControlledFighter` felülete nem tartalmaz pozíciót vagy állapotot, ezért határozz meg ehhez egy szűk View-adapter/interfészt, és hiányzó rajzolási adatoknál ne használj csendes alapértelmezést. A canvas állapotát mentsd és állítsd vissza.

### HUDRenderer.ts

> Készítsd el a `src/frontend/src/view/HUDRenderer.ts` osztályt a PDF View-fejezete és a `src/frontend/src/controller/README.md` alapján. A HUD a felhasználói felület meglévő DOM-elemeit frissítse, és implementálja a controller `MatchHUD.updateRoundScore(scores)` szerződését. Legyenek külön metódusok az életerő, energia, eltelt idő és menetstatisztikák frissítésére. A DOM-elemeket konstruktorban, `data-*` szelektorokkal keresd meg és gyorsítótárazd; hiányzó kötelező elemekről vagy hibás értékekről adj egyértelmű hibát. Az életerő és energia maximumát olvasd a modellen, ha elérhető, egyébként használj dokumentált alapértéket. A modellt ne módosítsd, és maradj szigorúan típusos TypeScriptnél.

## Knyihár Roland
Készíts egy egyszerű 2D Stickman Fighter játékot. Legyen egy alap controller, amivel a karakter tud balra-jobbra mozogni, ugrani, ütni és védekezni. 
Készíts hozzá egy egyszerű game loopot, ami kezeli a játék frissítését, a mozgást, az ütközéseket és a támadásokat. 
Legyen alap HP rendszer, és ha valamelyik játékos élete elfogy, érjen véget a kör.

## Nagy Kristóf
Kérlek egy docker alapu projekt strukturat alakitsunk ki a megfelelo fajlokkal és README-vel, fastAPI backend, ts frontend.   
Kérlek ez csináljuk meg az én részem. (Backend Frontend/BackendApiClient)    
Mi az a CORS védelem. miért felel az apiclient fájl.

## Értekes Lóránt

**Claude-Sonnet 4.6**
___

I need to develop a flash browser game where two stickmen fight each other. It should be a simple 2D platformer game, which can be played by two players from the same keyboard (offline multiplayer). Please plan the game mechanics schematically, using object oriented paradigm and design patterns where applicable. What design patterns fit naturally to such a game and why?
  
A team of four university students will work on this project. We will develop the whole codebase from scratch. What kind of splitting of the development tasks/features would make sense? How should we distribute the tasks? Maybe along the Model-View-Controller split?
  
I have 2 questions:
1. Did I understand it correctly that communication between the Fighter and other Model classes and the UI goes through EventBus and also directly, because UI reads Fighter state in every frame. Does it even make sense to use EventBus to communicate health changes to the UI, instead of the UI just simply reading health data from Fighter just like it reads its position and state?Or does this make the code cleaner or the execution of the program more effective if health changes are propagated through events instead of the UI directly reading health from the fighters in every frame?
2. Is it a correct approach if the moveLeft, moveRight, jump methods in the Fighter class only set the horizontal and vertical speed of the Fighter object and the PhysicsEngine will set its position after calculating collisions with platforms? The PhysicsEngine would receive the fighters and the platforms in its constructor and then in every frame,
calculate where the fighter should be, based on its speed and surrounding platforms and set the fighter's position accordingly.
  
Írd le kérlek magyarul, de az osztályok angol neveit megtartva, Frontend-Model, Frontend-View, Frontend-Controller és Backend szerinti bontásban, hogy milyen osztályok tartoznak az adott szekcióhoz, azok szerepe nagy vonalakban mi, milyen fő metódusaik és/vagy adattagjaik vannak és ezek szerepe nagy vonalakban mi. Külön részletezd továbbá hogy hogyan fognak egymással kommunikálni ezek az osztályok, különös tekintettel az egyes szekciókon átívelő kommunikációra, mint például hogy a FighterRenderer közvetlenül a Fighter osztály állapotát olvassa, a HUDRenderer és a MatchStatsListener osztályok viszont csak közvetve, az EventBus-on keresztül.

**Cline - Claude-Sonnet 4.6**
___

I am responsible for implementing the Frontend-Model classes. Please plan me the implementation of the Fighter, the Platform, Arena and PhysicsEngine classes. Please do not implement projectiles, they will be added in a later upgrade. Please do not touch any other class in this project for now, only the Frontend-Model classes.
  
I have a few questions:
1. why does the Fighter need both name and id? The name of the Fighter should be unique and thus can be used to identify the Fighter, I think there is no need for a superflouos id attribute.
2. why does the Fighter need a stop method? Would it be simpler if it was implemented so that the rightMove and leftMove methods only move it once, thus if none of these methods is called in a frame the Fighter automatically stops?
Blocking works the same way, right? As long as the key responsible for blocking is pressed, the Fighter is in a blocking state, but as soon as this key is released, the Fighter stops being in a blocking state.
3. We should not implement shooting/special attack. This feature is for a later upgrade. Even if other classes expect the Fighter to implement it, we still won't implement it.
4. Is the canvas width and height typically fixed for such flash browser games or does it change dynamically when the window size grows/shrinks?
5. instead of isOnGround please rename this attribute to isGrounded
6. Please discard the 'hurt' state from the Fighter.
7. To solve the issue that Fighters can fall down from the ground, please implement the PhysicsEngine so that it does not let the Fighters leave the canvas at all. They cannot leave the canvas from the sides, they cannot fall down and they cannot jump out through the top of the canvas either.
  
My answers:
1. id attribute can stay in Fighter
2. please do auto-stop instead of stopHorizontal and please modify the interface too, delete the stopHorizontal method from it
3. Please modify the interfaces requiring shootSpecial. Delete this method from them.
4. I accept your suggested default canvas layout with CSS scaling.

I have a few questions:
1. Please remove the assertFighter method from PhysicsEngine. There is no need for this method.
2. What purpose does the isActing() method in the Fighter class serve? If its only purpose is to decide whether the Fighter can move, then please rename it to canMove() and update other classes calling this method too.
3. The Fighter's attack method only checks if dist <= ATTACK_RANGE. This is not enough. It should check if the hitbox of the attacker collides with the hurtbox of the attacked Fighter.
  
Please create an index.html file which contains the canvas and other necessary HTML elements which the Renderer classes refer to. I want to build the app using vite, thus you should add a main.ts file serving as an entry point.
  
I tested the app, the stickman can block and jump, but they cannot move left/right. Please investigate where this issue originates from.

