// Physics engine setup using Matter.js
const Physics = (() => {
  const { Engine, World, Bodies, Body, Events, Composite } = Matter;

  let engine, world;
  let walls = [];
  let gameWidth, gameHeight;
  let groundY;

  function init(width, height) {
    gameWidth = width;
    gameHeight = height;
    groundY = height;

    engine = Engine.create({
      gravity: { x: 0, y: 1.8 },
    });
    world = engine.world;

    const wallThickness = 40;
    const wallInset = 4; // Keep fruits inside visible canvas area

    // Floor
    const floor = Bodies.rectangle(
      width / 2, height + wallThickness / 2 - wallInset,
      width + wallThickness * 2, wallThickness,
      { isStatic: true, label: 'wall', friction: 0.5, restitution: 0.2 }
    );

    // Left wall
    const leftWall = Bodies.rectangle(
      -wallThickness / 2 + wallInset, height / 2,
      wallThickness, height * 2,
      { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.2 }
    );

    // Right wall
    const rightWall = Bodies.rectangle(
      width + wallThickness / 2 - wallInset, height / 2,
      wallThickness, height * 2,
      { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.2 }
    );

    walls = [floor, leftWall, rightWall];
    World.add(world, walls);

    return { engine, world };
  }

  function createFruit(x, y, level) {
    const fruit = FRUITS[level];
    if (!fruit) return null;

    const body = Bodies.circle(x, y, fruit.radius, {
      restitution: 0.3,
      friction: 0.5,
      density: 0.001 + level * 0.0003,
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
