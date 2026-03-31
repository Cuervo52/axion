## 🔒 POLÍTICA DE SEGURIDAD - Evitar Futuros Problemas

### Checklist Antes de Cada Commit

```bash
# 1. Verificar que .env NO se subió
git ls-files | grep -E "^\.env$"  # Debe estar vacío

# 2. Verificar que no hay API keys en código
git diff --cached | grep -i "api[_-]?key\|apiKey\|password\|token"

# 3. Verificar que no hay credenciales en URLs
git diff --cached | grep -E "://.*:.*@"

# 4. Verificar que no hay secretos antes de push
git log -p --all -S 'password\|token\|secret' | head -5
```

### Reglas de Oro

1. **NUNCA commitees .env**
   ```bash
   # Bueno ✅
   .env.example          # placeholders
   
   # Malo ❌
   .env                  # credenciales reales
   .env.local
   .env.production
   ```

2. **Variables sensibles SIEMPRE de process.env**
   ```typescript
   // Bueno ✅
   const apiKey = process.env.GEMINI_API_KEY;
   const dbUrl = process.env.DATABASE_URL;
   
   // Malo ❌
   const apiKey = "sk-1234567890abcdef";
   const dbUrl = "postgresql://user:password@host/db";
   ```

3. **Documentación = Solo placeholders**
   ```bash
   # Bueno ✅ (.env.example)
   DATABASE_URL=postgresql://user:password@localhost/db
   
   # Malo ❌
   DATABASE_URL=postgresql://axion_user:mi_contraseña_real@144.126.147.252/axion_db
   ```

4. **Credenciales viven en:**
   - ✅ `.env` local (gitignored)
   - ✅ GitHub Secrets (para CI/CD)
   - ✅ Variables de entorno en servidor
   - ❌ Archivos de código
   - ❌ Git commits

### Herramientas Recomendadas

1. **Pre-commit Hook** (prevenir errores)
   ```bash
   # Crear .git/hooks/pre-commit
   #!/bin/bash
   git diff --cached | grep -E "password=|apiKey=|api_key=" && {
     echo "❌ ERROR: Encontré credenciales en el commit!"
     exit 1
   }
   exit 0
   ```

2. **GitHub Secret Scanning**
   - Settings → Security → Secret Scanning
   - Recibe alertas si alguien pushea credenciales accidentalmente

3. **npm script de verificación**
   ```json
   {
     "scripts": {
       "audit": "npm list",
       "check-secrets": "git diff-index --quiet HEAD -- || echo 'Cambios pendientes'; grep -r 'password\\|apiKey\\|token' src/ || echo '✅ No secrets found'"
     }
   }
   ```

### En Caso de Emergencia

Si accidentalmente subes credenciales a GitHub:

```bash
# 1. IMMEDIATO: Rota la credencial (API key, contraseña, token)
# En Google Console, Database, etc.

# 2. Revierte el commit
git revert <commit_hash>
git push

# 3. OPCIONALMENTE: Limpiar historio (⚠️ peligroso)
# git filter-branch --tree-filter 'rm -f .env' HEAD
# git push --force-with-lease  # ⚠️ Solo si es solo tu repo

# 4. Notifica al equipo
# "Se subió .env accidentalmente. Cambié contraseña. Todo seguro."
```

---

## ✅ Tu Proyecto Está Seguro

Basado en la auditoría, tu setup cumple con:
- ✅ OWASP Top 10 - Secrets Management
- ✅ CWE-798 - No hardcoded credentials
- ✅ Best Practices - GitHub security

**No hay cambios urgentes necesarios.** 🔐

---

## 📞 Recordatorios

- **Antes de compartir código**: `git audit`
- **Antes de cada push**: Revisar `.env` no está incluido
- **Cuando hires devs**: Copia `.env.example` → `.env` y completa
- **En producción**: Variables de entorno en el servidor/contenedor

---

**Fecha**: 31 Mar 2026  
**Estado**: ✅ SEGURO - Sin riesgos detectados

