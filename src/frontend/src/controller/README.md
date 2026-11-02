# Controller réteg

A négy osztály az `OVRT_Stickman_Dojo.pdf` 43–45. oldalán leírt
felelősségeket követi. A `types.ts` a közös adattípusokat, az `eventBus.ts`
a típusos eseménykezelést tartalmazza. A Model és View fájljai jelenleg üresek;
a bekötési felületeket a `contracts.ts` és a `GameLoopOptions` definiálja.
Ez a változtatás önmagában még nem indít el böngészőben játszható játékot.

## Osztályok

- `InputManager`: billentyűállapot, `isDown`, `consume`, fókuszvesztéskor
  törlés, eseménykezelők csatlakoztatása és leválasztása. Az `event.key`
  értékeit használja, kis- és nagybetűtől függetlenül. A Space neve `' '`.
- `PlayerController`: mozgás, ugrás, blokk, közelharci és speciális támadás
  továbbítása a Fighternek. A `setBindings` futás közben módosítja a kiosztást.
  Egyszerre balra és jobbra nyomva a karakter megáll. A speciális támadás
  egyszer történik meg lenyomásonként; a többi művelet tartott billentyűvel működik.
- `MatchController`: új menet, harcosok/statisztikák/világ resetelése,
  eltelt idő, sorozatpontok, eredmény-pillanatkép, opcionális backendmentés.
  A `MATCH_ENDED` eseményre csak egyszer reagál menetenként.
- `GameLoop`: leállítható `requestAnimationFrame` ciklus. A modellfrissítés
  sorrendje input → fizika → harcosok → lövedékek, majd a rajzolás sorrendje
  pálya → lövedékek → harcosok → HUD. Menetvégén csak a rajzolás folytatódik.

Alapértelmezett kiosztás:

| Művelet | P1 | P2 |
| --- | --- | --- |
| Mozgás | A / D | ← / → |
| Ugrás | W | ↑ |
| Blokk | S | ↓ |
| Közelharc | F | L |
| Energiagolyó | G | K |
| Új menet a befejezés után | Space | Space |

## Model és View bekötése

A `ControlledFighter` felületén a `hp`, `id`, `name`, `color` olvasható.
A mozgást a `moveLeft`, `moveRight`, `stopHorizontal`, `jump` metódusok kezelik.
A `setBlocking(boolean)` a Model saját állapotgépére fordítható;
az `attack(enemy)` a közelharci, a `shootSpecial(enemy)` a távolsági támadás.
A Model felelőssége a földön állás, az energia, a támadási időzítés és a
hit-stun ellenőrzése. A controller nem példányosít konkrét FighterState osztályt.
Ha a Model eltérő neveket használ (`health`, `slash`, stb.), adapter szükséges.

A `MatchStats` számlálóit a későbbi statisztikahallgató frissíti.
Sebzéskor előbb a HP és a statisztikai események frissüljenek, majd jöjjön
a `MATCH_ENDED`, hogy a mentett eredmény az utolsó találatot is tartalmazza.
Minden komponens ugyanazt az EventBus példányt használja.

Az alábbi bekötési minta a Model/View/API objektumok elkészülte után használható:

```ts
const bus = EventBus.getInstance();
const input = new InputManager(window);
const p1Controller = new PlayerController(p1, input, PLAYER_ONE_BINDINGS);
const p2Controller = new PlayerController(p2, input, PLAYER_TWO_BINDINGS);

const match = new MatchController({
  fighters: [p1, p2], // id: 1, illetve id: 2
  stats,
  input,
  eventBus: bus,
  hud: hudRenderer,
  api: backendApiClient, // postMatch(payload): Promise<unknown>; opcionális
  resetWorld: () => projectileManager.clear(),
});

const loop = new GameLoop({
  controllers: [p1Controller, p2Controller],
  input,
  matchController: match,
  stats,
  updatePhysics: fighter => physics.update(fighter, platforms),
  updateProjectiles: fighters => projectileManager.update(fighters),
  drawArena: () => arenaRenderer.draw(ctx, platforms),
  drawProjectiles: () => projectileRenderer.draw(projectileManager.getAll(), ctx),
  drawFighter: fighter => fighterRenderer.draw(fighter, ctx),
  updateHUD: (fighters, elapsed, currentStats) => {
    for (const fighter of fighters) {
      hudRenderer.updateHP(fighter);
      hudRenderer.updateEnergy(fighter);
    }
    hudRenderer.updateTimer(elapsed);
    hudRenderer.updateStats(currentStats);
  },
});

match.startNewRound();
loop.start();

// Model: halál esetén, a sebzés és statisztika frissítése után
bus.emit({ type: 'MATCH_ENDED', winnerId: 1 });
// Döntetlen: winnerId: null. A JSON winner mezője ekkor "draw",
// egyébként a győztes harcos neve. A pontszám az ID alapján változik.

// Kilépéskor:
loop.stop();
input.detach();
match.dispose();
```

A `resetWorld` törölje az összes korábbi lövedéket. A mentési payload a már
meglévő `backend/main.py` mezőit követi; az API-kliens feladata a
`POST /api/v1/matches` kérés. Az API-kliens nincs ebben a controller feladatban
implementálva. Mentési hiba `MATCH_SAVE_FAILED` eseményt küld; az eredmény a
`lastMatchPayload` tulajdonságból kérhető le, a mentés a `saveCompleted`
Promise-on várható meg. A sikertelen mentés nem akadályozza az új menetet.

A szimuláció fix 60 lépés/másodperc sebességű, így a PDF képkockánkénti
sebességei és cooldownjai használhatók. Egy visszatérő böngészőképkocka
legfeljebb 250 ms-ot pótol. Az eltelt menetidő valós, monoton idő: a háttérben
töltött időt is tartalmazza. A `stop()` a ciklust állítja le, nem szünetelteti
a mérkőzés óráját. Az első menetet explicit `startNewRound()` indítja.

## Ellenőrzés

A `src/frontend` mappában, Node.js 22.18 vagy újabb verzióval:

```sh
npm install
npm run typecheck
npm test
```

A tesztek böngésző, valódi backend és elkészült Model/View nélkül futnak,
ellenőrzött helyettesítő objektumokkal és vezérelhető képkockaütemezővel.
