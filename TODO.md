En cours :

Relativement important : 
🛑 Traffic manager
🛑 Nettoyer le code déplacement storage une fois terminé

A faire :
📌 Alliance code avec D3Matt
🟡 Remote mining (fait minimaliste)
💊 Construire source container plus tôt.
💊 les builders spawn en double? à surveiller et corriger le cas échéant
📌 Surveiller heatmap
📌 Défenses basiques avant towers?
📌 Refonte GetEnergy()
📌 Ajuster haulsourcelength avec link
📌 Ajuster haulerneeded sur taille hauler
📌 Déterminer economie avant storage
📌 remplir hauler plus efficacement avant de faire un job
🧲 Attention : Build roads/structures désactivés.

Fait :
🟢 Ne pas construire mineral container avant extracteur
🟡 Ajuster builder et upgrader sur economie (fait juste pour upgrader)
🟢 Checker la prise de job (hauler aller retour)
🟢 Modifier jobs (creep request -> best job for creep)
🎁 Withdraw / remplissage des ressources non énergies
🟢 Déplacer buildBodyParts dans room
🟢 supprimer lemergium de myharvest et ajouter job haul resources rares


Game.rooms['W37S37'].spawnCreepForRole('builder')
Game.rooms['W36S38'].spawnCreepForRole('builder')
Game.rooms['W37S37'].spawnCreepForRole('upgrader')
Game.rooms['W36S38'].spawnCreepForRole('upgrader')