En cours :

Relativement important : 
🛑 Traffic manager

A faire :
🟡 Remote mining (fait minimaliste)
💊 Construire source container plus tôt.
📌 Défenses basiques avant towers?
📌 Refonte GetEnergy()
📌 Ajuster le besoin en haul
📌 Déterminer economie avant storage
📌 remplir hauler plus efficacement avant de faire un job


Fait :
📌 Surveiller heatmap
?? les builders spawn en double? à surveiller et corriger le cas échéant
🟢 Alliance code avec D3Matt
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