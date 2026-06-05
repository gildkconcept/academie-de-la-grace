// scripts/load-test.js
const { createClient } = require('@supabase/supabase-js')

// Tes informations Supabase
const supabaseUrl = 'https://zdvlylnpttwfwsyharvz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkdmx5bG5wdHR3ZndzeWhhcnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzU5MTgsImV4cCI6MjA4OTA1MTkxOH0.ids9TjSIKuV5x4OMXr22LbSRSXP4zgRr8MVVR9Ywdnk'

// Configuration du test
const NB_UTILISATEURS = 150  // ← TU PEUX CHANGER ICI
const DUREE_TEST_SECONDES = 30

async function simulateUsers() {
  console.log(`🚀 DÉBUT DU TEST - ${NB_UTILISATEURS} utilisateurs simulés`)
  console.log(`⏱️ Durée: ${DUREE_TEST_SECONDES} secondes`)
  console.log(`📊 Surveillance: va sur Supabase Dashboard → Database → Connections`)
  console.log('')
  
  const startTime = Date.now()
  let requetesReussies = 0
  let requetesEchouees = 0
  
  // Créer un tableau de promesses pour tous les utilisateurs
  const promesses = []
  
  for (let i = 0; i < NB_UTILISATEURS; i++) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Chaque utilisateur fait 3 requêtes (pour simuler une vraie utilisation)
    const requete = supabase
      .from('students')
      .select('count', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) {
          requetesEchouees++
          console.log(`❌ Utilisateur ${i + 1} - ERREUR: ${error.message}`)
        } else {
          requetesReussies++
          if (i < 10 || i >= NB_UTILISATEURS - 10) {
            console.log(`✅ Utilisateur ${i + 1} - OK (${count} étudiants)`)
          } else if (i === 10) {
            console.log(`... ${NB_UTILISATEURS - 20} autres utilisateurs ...`)
          }
        }
      })
    
    promesses.push(requete)
  }
  
  // Attendre que toutes les requêtes soient terminées
  await Promise.all(promesses)
  
  const duree = (Date.now() - startTime) / 1000
  
  console.log('')
  console.log('========================================')
  console.log(`📊 RÉSULTATS DU TEST`)
  console.log(`   - Utilisateurs: ${NB_UTILISATEURS}`)
  console.log(`   - Requêtes réussies: ${requetesReussies}`)
  console.log(`   - Requêtes échouées: ${requetesEchouees}`)
  console.log(`   - Durée: ${duree} secondes`)
  console.log('========================================')
  console.log('')
  console.log(`👉 Va voir ton dashboard Supabase maintenant !`)
  console.log(`   Les connexions DB devraient être visibles`)
}

// Lancer le test
simulateUsers().catch(console.error)