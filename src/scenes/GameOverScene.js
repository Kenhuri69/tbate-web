/**
 * GAME OVER SCENE — Overlay
 *
 * Lancée par Level1Scene ou GameScene en réaction à `player:died` :
 *   scene.launch('GameOverScene', { sourceKey: this.scene.key });
 *
 * Voile noir, titre rouge, [R]/clic/tap pour relancer.
 * Au restart : remet à zéro l'état partagé (`playerState`) puis
 * `stop` + `start` la scène source.
 *
 * Dépend de (globals) : Phaser, playerState
 */
class GameOverScene extends Phaser.Scene {

    constructor() { super({ key: 'GameOverScene' }); }

    init(data) {
        this.sourceKey = data?.sourceKey ?? 'GameScene';
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78)
            .setScrollFactor(0).setDepth(0);

        this.add.text(W/2, H/2 - 30, 'GAME OVER', {
            fontFamily: 'monospace', fontSize: '36px',
            color: '#ff3333', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1);

        this.add.text(W/2, H/2 + 20, '[R] · Clic · Tap pour recommencer', {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#ffffff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1);

        this.input.on('pointerdown', () => this._restart());
        this.input.keyboard.on('keydown-R', () => this._restart());
    }

    _restart() {
        // Reset état partagé
        playerState.manaCoreLevel = 0;
        playerState.manaEssence   = 0;
        for (const k of Object.keys(playerState.inventory)) {
            playerState.inventory[k] = 0;
        }

        // Stop puis restart la scène source. Stop avant pour vider proprement.
        this.scene.stop(this.sourceKey);
        const dlg = this.scene.get('DialogueScene');
        if (dlg && dlg.sys.settings.active) this.scene.stop('DialogueScene');
        this.scene.start(this.sourceKey);
        this.scene.stop();
    }
}
