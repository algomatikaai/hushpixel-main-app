# 🔧 HushPixel Build Fixes Guide

**Context**: Build failing due to missing dependencies. Implementing mocks for immediate deployment.  
**Priority**: Money printer first, perfect APIs later.  
**Timeline**: 20 minutes to working build.  

---

## 🚨 **Current Build Errors & Solutions**

### **Error 1: ModelsLab API Missing**
```
Module not found: Can't resolve '@/lib/modelslab-api'
```

**Files Affected**:
- `/apps/web/app/api/generate/route.ts`

**Solution**: Create mock ModelsLab API
```typescript
// Create: /apps/web/lib/modelslab-api.ts
export async function generateCompanionImage(prompt: string, quality: string) {
  // Mock delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    imageUrl: '/images/quiz/placeholder-generation.png',
    message: 'Your companion is being generated! Check back soon.',
    credits_used: 1
  };
}

export function getGenerationErrorMessage(error: any) {
  return 'Generation service temporarily unavailable. Try again soon!';
}
```

### **Error 2: Progress Component Import**
```
Module not found: Package path ./progress is not exported
```

**Files Affected**:
- `/apps/web/app/home/(user)/_components/onboarding-tooltips.tsx`
- `/apps/web/app/home/(user)/_components/upgrade-prompt.tsx`

**Solution**: ✅ ALREADY FIXED
```typescript
// Changed from:
import { Progress } from '@kit/ui/progress';
// To:
import { Progress } from '@kit/ui/shadcn/progress';
```

### **Error 3: Analytics Service Missing**
```
Module not found: Can't resolve '../../../../../packages/features/admin/src/lib/server/services/admin-analytics.service'
```

**Files Affected**:
- `/apps/web/app/api/analytics/error/route.ts`
- `/apps/web/app/api/analytics/track/route.ts`

**Solution**: ✅ ALREADY FIXED - Commented out imports and service calls

---

## 🛠️ **Step-by-Step Build Fix Process**

### **Step 1: Create Mock ModelsLab API** (5 minutes)
```bash
cd /Users/rianhafizm1/Desktop/hushpixel/hushpixel-main-app/apps/web
mkdir -p lib
touch lib/modelslab-api.ts
```

Copy the mock implementation above into the file.

### **Step 2: Create Mock Bridge Auth** (3 minutes)
```typescript
// Create: /apps/web/lib/bridge-auth.ts
export function generateCharacterName(prompt: string): string {
  const names = ['Luna', 'Aria', 'Zara', 'Nova', 'Maya', 'Kira'];
  return names[Math.floor(Math.random() * names.length)];
}
```

### **Step 3: Test Build** (2 minutes)
```bash
pnpm --filter web build
```

**Expected Result**: Build succeeds with warnings (not errors)

---

## 🎯 **Build Success Criteria**

### **Must Have** ✅
- [ ] `pnpm --filter web build` completes successfully
- [ ] Quiz route (`/quiz`) accessible
- [ ] Facebook Pixel script loads
- [ ] No blocking TypeScript errors

### **Nice to Have** (Can ignore for now)
- TypeScript warnings about unused imports
- Missing analytics service warnings
- Mock API console logs

---

## 🔍 **Troubleshooting Guide**

### **If Build Still Fails**
1. **Check file paths**: Ensure all mock files created in correct locations
2. **Clear cache**: `rm -rf .next node_modules/.cache`
3. **Reinstall**: `pnpm install`
4. **Check imports**: Verify all `@/lib/` imports have corresponding files

### **If Quiz Route Doesn't Work**
1. **Check route file**: `/apps/web/app/quiz/page.tsx`
2. **Verify components**: Quiz components in `_components/` folder
3. **Test Supabase**: Environment variables set correctly

### **If Facebook Pixel Doesn't Fire**
1. **Check Pixel Helper**: Chrome extension shows green
2. **Verify Pixel ID**: `24219411987653826` in environment
3. **Test events**: Console logs show pixel events

---

## 📋 **Quick Command Reference**

```bash
# Navigate to main app
cd /Users/rianhafizm1/Desktop/hushpixel/hushpixel-main-app

# Install dependencies (if needed)
pnpm install

# Build web app only
pnpm --filter web build

# Start development (to test locally)
pnpm --filter web dev

# Deploy to Netlify (after build succeeds)
netlify deploy --prod --dir=apps/web/.next
```

---

## 🎉 **Success Indicators**

### **Build Success**
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Route manifest generated
```

### **Deployment Success**  
- Quiz loads at `/quiz` route
- Meta Pixel Helper shows green checkmark
- Email capture submits successfully
- No console errors blocking user flow

---

## 📝 **Next Steps After Build Success**

1. **Test Quiz Flow**: Complete character → body type → email
2. **Verify Pixel Tracking**: Check Facebook Events Manager
3. **Deploy to Netlify**: Use working build for production
4. **Add Real APIs Later**: After revenue validation

**Remember**: Money printer first, perfect APIs later! 💰