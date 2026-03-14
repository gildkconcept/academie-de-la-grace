const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Mot de passe:', password);
    console.log('Hash généré:', hash);
    
    // Vérification
    const isValid = await bcrypt.compare(password, hash);
    console.log('Test de vérification:', isValid ? 'OK ✓' : 'ERREUR ✗');
}

generateHash();