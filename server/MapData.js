const { TILE_STEEL, TILE_BRICK, TILE_WATER, TILE_BUSH, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } = require('./Constants');

class MapData {
  static getMaps() {
    return [
      {
        id: 'classic',
        name: 'Savaş Meydanı (Classic)',
        theme: 'military',
        description: 'Dengeli koridorlar, siperler ve merkez güçlendirme bölgesi.',
        cols: Math.floor(MAP_WIDTH / TILE_SIZE),
        rows: Math.floor(MAP_HEIGHT / TILE_SIZE)
      },
      {
        id: 'urban',
        name: 'Şehir Labirenti (Urban Maze)',
        theme: 'urban',
        description: 'Mermi sektirme için dar sokaklar, kırılabilir tuğla duvarlar ve gizlenme çalıları.',
        cols: Math.floor(MAP_WIDTH / TILE_SIZE),
        rows: Math.floor(MAP_HEIGHT / TILE_SIZE)
      },
      {
        id: 'desert',
        name: 'Çöl Kalesi (Desert Fortress)',
        theme: 'desert',
        description: 'Açık nişancı hatları ve merkezde korunan askeri sığınak.',
        cols: Math.floor(MAP_WIDTH / TILE_SIZE),
        rows: Math.floor(MAP_HEIGHT / TILE_SIZE)
      }
    ];
  }

  static generateMap(mapId = 'classic') {
    const cols = Math.floor(MAP_WIDTH / TILE_SIZE);
    const rows = Math.floor(MAP_HEIGHT / TILE_SIZE);
    
    // Grid: 0 = Empty, 1 = Steel, 2 = Brick (destructible), 3 = Water, 4 = Bush
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    const powerupSpawns = [];
    const spawns = [];

    // Outer boundary walls (Steel)
    for (let c = 0; c < cols; c++) {
      grid[0][c] = TILE_STEEL;
      grid[rows - 1][c] = TILE_STEEL;
    }
    for (let r = 0; r < rows; r++) {
      grid[r][0] = TILE_STEEL;
      grid[r][cols - 1] = TILE_STEEL;
    }

    if (mapId === 'urban') {
      // Maze-like urban structures
      for (let r = 4; r < rows - 4; r += 4) {
        for (let c = 4; c < cols - 4; c += 4) {
          const isBrick = (r + c) % 3 === 0;
          const type = isBrick ? TILE_BRICK : TILE_STEEL;
          grid[r][c] = type;
          grid[r + 1][c] = type;
          grid[r][c + 1] = type;
        }
      }

      // Bush zones for ambushes
      for (let r = 7; r < rows - 7; r += 6) {
        for (let c = 7; c < cols - 7; c += 6) {
          grid[r][c] = TILE_BUSH;
          grid[r][c + 1] = TILE_BUSH;
          grid[r + 1][c] = TILE_BUSH;
        }
      }

      // Center powerup spawn
      powerupSpawns.push(
        { x: (cols / 2) * TILE_SIZE, y: (rows / 2) * TILE_SIZE },
        { x: 8 * TILE_SIZE, y: 8 * TILE_SIZE },
        { x: (cols - 8) * TILE_SIZE, y: 8 * TILE_SIZE },
        { x: 8 * TILE_SIZE, y: (rows - 8) * TILE_SIZE },
        { x: (cols - 8) * TILE_SIZE, y: (rows - 8) * TILE_SIZE }
      );
    } else if (mapId === 'desert') {
      // Fortress in center
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      
      // Central fortress box with open entrances
      for (let r = midR - 4; r <= midR + 4; r++) {
        for (let c = midC - 6; c <= midC + 6; c++) {
          if (r === midR - 4 || r === midR + 4 || c === midC - 6 || c === midC + 6) {
            // Leave gate openings
            if (Math.abs(r - midR) <= 1 && (c === midC - 6 || c === midC + 6)) continue;
            if (Math.abs(c - midC) <= 1 && (r === midR - 4 || r === midR + 4)) continue;
            grid[r][c] = TILE_STEEL;
          }
        }
      }

      // Destructible brick outposts
      const outposts = [
        { r: 6, c: 8 }, { r: 6, c: cols - 9 },
        { r: rows - 7, c: 8 }, { r: rows - 7, c: cols - 9 }
      ];
      for (const op of outposts) {
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            if (dr === 1 && dc === 1) continue;
            grid[op.r + dr][op.c + dc] = TILE_BRICK;
          }
        }
      }

      powerupSpawns.push(
        { x: midC * TILE_SIZE, y: midR * TILE_SIZE },
        { x: 9 * TILE_SIZE, y: 7 * TILE_SIZE },
        { x: (cols - 8) * TILE_SIZE, y: 7 * TILE_SIZE },
        { x: 9 * TILE_SIZE, y: (rows - 6) * TILE_SIZE },
        { x: (cols - 8) * TILE_SIZE, y: (rows - 6) * TILE_SIZE }
      );
    } else {
      // Classic Arena
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);

      // Central ring / barriers
      grid[midR - 2][midC - 2] = TILE_STEEL;
      grid[midR - 2][midC + 2] = TILE_STEEL;
      grid[midR + 2][midC - 2] = TILE_STEEL;
      grid[midR + 2][midC + 2] = TILE_STEEL;

      // Brick clusters (destructible covers)
      const brickClusters = [
        [midR - 5, midC], [midR + 5, midC],
        [midR, midC - 6], [midR, midC + 6],
        [6, 6], [6, cols - 7], [rows - 7, 6], [rows - 7, cols - 7],
        [10, midC - 8], [10, midC + 8],
        [rows - 11, midC - 8], [rows - 11, midC + 8]
      ];

      for (const [r, c] of brickClusters) {
        grid[r][c] = TILE_BRICK;
        grid[r][c + 1] = TILE_BRICK;
        grid[r + 1][c] = TILE_BRICK;
        grid[r + 1][c + 1] = TILE_BRICK;
      }

      // Strategic bush patches for hiding
      grid[midR - 4][midC - 4] = TILE_BUSH;
      grid[midR - 4][midC + 4] = TILE_BUSH;
      grid[midR + 4][midC - 4] = TILE_BUSH;
      grid[midR + 4][midC + 4] = TILE_BUSH;
      grid[midR][midC] = TILE_BUSH;

      powerupSpawns.push(
        { x: midC * TILE_SIZE, y: (midR - 7) * TILE_SIZE },
        { x: midC * TILE_SIZE, y: (midR + 7) * TILE_SIZE },
        { x: (midC - 9) * TILE_SIZE, y: midR * TILE_SIZE },
        { x: (midC + 9) * TILE_SIZE, y: midR * TILE_SIZE },
        { x: midC * TILE_SIZE, y: midR * TILE_SIZE }
      );
    }

    // Generate safe player/bot spawn points
    const candidateSpawns = [
      { x: 3 * TILE_SIZE, y: 3 * TILE_SIZE },
      { x: (cols - 4) * TILE_SIZE, y: 3 * TILE_SIZE },
      { x: 3 * TILE_SIZE, y: (rows - 4) * TILE_SIZE },
      { x: (cols - 4) * TILE_SIZE, y: (rows - 4) * TILE_SIZE },
      { x: Math.floor(cols / 2) * TILE_SIZE, y: 4 * TILE_SIZE },
      { x: Math.floor(cols / 2) * TILE_SIZE, y: (rows - 5) * TILE_SIZE },
      { x: 4 * TILE_SIZE, y: Math.floor(rows / 2) * TILE_SIZE },
      { x: (cols - 5) * TILE_SIZE, y: Math.floor(rows / 2) * TILE_SIZE }
    ];

    for (const sp of candidateSpawns) {
      const tileC = Math.floor(sp.x / TILE_SIZE);
      const tileR = Math.floor(sp.y / TILE_SIZE);
      if (grid[tileR] && grid[tileR][tileC] === 0) {
        spawns.push(sp);
      }
    }

    // Brick health tracking (for destructible bricks)
    const brickHealth = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === TILE_BRICK) {
          brickHealth[`${r}_${c}`] = 2; // Takes 2 direct hits
        }
      }
    }

    return {
      mapId,
      cols,
      rows,
      grid,
      brickHealth,
      powerupSpawns,
      spawns
    };
  }
}

module.exports = MapData;

