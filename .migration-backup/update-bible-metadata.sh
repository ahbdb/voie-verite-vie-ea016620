#!/bin/bash

# Script pour mettre à jour les fichiers JSON bibliques
# Ajoute les champs id et abbreviation manquants

cd /workspaces/voie-verite-vie/src/data/bible-content || exit

# Mapping ID -> Abréviation
declare -A abbreviations=(
  [01]="Gn" [02]="Ex" [03]="Lv" [04]="Nb" [05]="Dt"
  [06]="Jos" [07]="Jg" [08]="Rt" [09]="1S" [10]="2S"
  [11]="1R" [12]="2R" [13]="1Ch" [14]="2Ch" [15]="Esd"
  [16]="Né" [17]="Est" [18]="Job" [19]="Ps" [20]="Pr"
  [21]="Qo" [22]="Es" [23]="Jr" [24]="Lm" [25]="Ez"
  [26]="Dn" [27]="Os" [28]="Jl" [29]="Am" [30]="Abd"
  [31]="Jon" [32]="Mi" [33]="Na" [34]="Ha" [35]="Sop"
  [36]="Ag" [37]="Za" [38]="Ml" [39]="Ba"
  [40]="Mt" [41]="Mc" [42]="Lc" [43]="Jn"
  [44]="Ac" [45]="Rm" [46]="1Co" [47]="2Co"
  [48]="Ga" [49]="Ep" [50]="Ph" [51]="Col"
  [52]="1Th" [53]="2Th" [54]="1Tm" [55]="2Tm"
  [56]="Tt" [57]="Phm" [58]="He" [59]="Jc"
  [60]="1P" [61]="2P" [62]="1Jn" [63]="2Jn"
  [64]="3Jn" [65]="Jud" [66]="Ap"
  [67]="Tb" [68]="Jdt" [69]="Sg" [70]="Sc"
  [71]="1Mc" [72]="2Mc" [73]="Sap"
)

for file in *.json; do
  if [[ $file =~ ^([0-9]+)- ]]; then
    id="${BASH_REMATCH[1]}"
    id_int=$((10#$id))
    abbr="${abbreviations[$id]}"
    
    if [ -n "$abbr" ]; then
      # Utiliser jq pour ajouter les champs au début du JSON
      jq --arg id "$id_int" --arg abbr "$abbr" \
        '{id: ($id | tonumber), abbreviation: $abbr} + .' "$file" > "${file}.tmp" && \
        mv "${file}.tmp" "$file"
      echo "✓ $file (ID: $id_int, Abbr: $abbr)"
    fi
  fi
done

echo "✓ Tous les fichiers ont été mis à jour avec id et abbreviation!"
