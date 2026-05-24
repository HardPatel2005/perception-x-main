require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

async function checkUsage() {
    try {
        console.log('📊 Checking Cloudinary usage...\n');
        
        const usage = await cloudinary.api.usage();
        
        if (usage.storage) {
            const usedBytes = usage.storage.used_bytes || 0;
            const quotaBytes = usage.storage.quota_bytes || 0;
            const usedMB = usedBytes / (1024 * 1024);
            const quotaMB = quotaBytes / (1024 * 1024);
            const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes * 100) : 0;
            
            console.log(`📦 Storage Usage:`);
            console.log(`   Used: ${usedMB.toFixed(2)} MB`);
            console.log(`   Quota: ${quotaMB.toFixed(2)} MB`);
            console.log(`   Used: ${percentUsed.toFixed(1)}%`);
            console.log(`   Available: ${(quotaMB - usedMB).toFixed(2)} MB`);
            
            if (usedMB > quotaMB) {
                console.log(`\n⚠️ WARNING: Over quota by ${(usedMB - quotaMB).toFixed(2)} MB`);
                console.log(`   Need to delete more files!`);
            }
        }
        
        // Count resources
        console.log('\n📁 Counting resources...');
        const resourceTypes = ['image', 'video', 'raw'];
        let totalCount = 0;
        
        for (const resourceType of resourceTypes) {
            try {
                const result = await cloudinary.api.resources({
                    type: 'upload',
                    resource_type: resourceType,
                    max_results: 1
                });
                const count = result.total_count || 0;
                totalCount += count;
                console.log(`   ${resourceType}: ${count} files`);
            } catch (err) {
                console.log(`   ${resourceType}: Error - ${err.message}`);
            }
        }
        
        console.log(`\n   Total: ${totalCount} files`);
        
    } catch (error) {
        console.error('❌ Error checking usage:', error.message);
        if (error.http_code) {
            console.error(`   HTTP Code: ${error.http_code}`);
        }
    }
}

checkUsage();
