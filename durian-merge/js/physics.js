// Physics engine setup using Matter.js
const Physics = (() => {
  const { Engine, World, Bodies, Body, Events, Composite, Sleeping } = Matter;

  let engine, world;
  let walls = [];
  let gameWidth, gameHeight;
  let groundY;

  // Per-level physics parameters: [restitution, friction, density, frictionAir]
  // Larger fruits = heavier, less bouncy, more friction → realistic weight feel
  const PHYSICS_TABLE = [
    [0.35, 0.40, 0.0012, 0.007],  // 0 Lychee (r=18) — light, bouncy
    [0.32, 0.42, 0.0014, 0.008],  // 1 Lime (r=24)
    [0.30, 0.45, 0.0016, 0.009],  // 2 Rambutan (r=30)
    [0.28, 0.47, 0.0018, 0.010],  // 3 Passion Fruit (r=36)
    [0.25, 0.50, 0.0022, 0.011],  // 4 Mango (r=43)
    [0.22, 0.52, 0.0026, 0.012],  // 5 Dragon Fruit (r=50)
    [0.18, 0.55, 0.0032, 0.014],  // 6 Papaya (r=58)
    [0.14, 0.58, 0.0040, 0.016],  // 7 Coconut (r=66) — heavy, barely bounces
    [0.10, 0.60, 0.0050, 0.018],  // 8 Pineapple (r=75)
    [0.08, 0.65, 0.0065, 0.020],  // 9 Durian (r=85) — heaviest, thuds
    [0.35, 0.40, 0.0010, 0.007],  // 10 Queen (r=20, special — light, bouncy)
  ];

  function init(width, height) {
    gameWidth = width;
    gameHeight = height;
    groundY = height;

    engine = Engine.create({
      gravity: { x: 0, y: 1.8 },
      enableSleeping: true,
      positionIterations: 8,  // 기본 6 → 8 (충돌 정확도 향상)
      velocityIterations: 6,  // 기본 4 → 6
    });
    world = engine.world;

    const wallThickness = 40;
    const wallInset = 4; // Keep fruits inside visible canvas area

    // Floor
    const floor = Bodies.rectangle(
      width / 2, height + wallThickness / 2 - wallInset,
      width + wallThickness * 2, wallThickness,
      { isStatic: true, label: 'wall', friction: 0.5, restitution: 0.15 }
    );

    // Left wall
    const leftWall = Bodies.rectangle(
      -wallThickness / 2 + wallInset, height / 2,
      wallThickness, height * 2,
      { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.1 }
    );

    // Right wall
    const rightWall = Bodies.rectangle(
      width + wallThickness / 2 - wallInset, height / 2,
      wallThickness, height * 2,
      { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.1 }
    );

    walls = [floor, leftWall, rightWall];
    World.add(world, walls);

    return { engine, world };
  }

  function createFruit(x, y, level) {
    const fruit = FRUITS[level];
    if (!fruit) return null;

    const params = PHYSICS_TABLE[level] || PHYSICS_TABLE[0];

    const body = Bodies.circle(x, y, fruit.radius, {
      restitution: params[0],
      friction: params[1],
      density: params[2],
      frictionAir: params[3],
      label: 'fruit',
      fruitLevel: level,
      isMerging: false,
    });

    World.add(world, body);
    return body;
  }

  function removeFruit(body) {
    World.remove(world, body);
  }

  function update(delta) {
    Engine.update(engine, delta);
  }

  function onCollision(callback) {
    Events.on(engine, 'collisionStart', callback);
    // collisionActive: only wake sleeping bodies (merge logic handled by collisionStart)
    Events.on(engine, 'collisionActive', (event) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.isSleeping) Sleeping.set(pair.bodyA, false);
        if (pair.bodyB.isSleeping) Sleeping.set(pair.bodyB, false);
      }
    });
  }

  function getAllBodies() {
    return Composite.allBodies(world).filter(b => !b.isStatic);
  }

  function setStatic(body, isStatic) {
    Body.setStatic(body, isStatic);
  }

  function setPosition(body, x, y) {
    Body.setPosition(body, { x, y });
  }

  function setVelocity(body, vx, vy) {
    Body.setVelocity(body, { x: vx, y: vy });
  }

  return {
    init, createFruit, removeFruit, update,
    onCollision, getAllBodies, setStatic, setPosition, setVelocity,
    getEngine: () => engine,
    getWorld: () => world,
  };
})();
