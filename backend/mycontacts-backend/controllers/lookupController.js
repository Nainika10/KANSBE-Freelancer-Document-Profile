const Lookup = require('../models/lookupModel');
const asyncHandler = require('express-async-handler');

// =====================================================
// 1. GET ITEMS
// =====================================================
const getItems = asyncHandler(async (req, res) => {
    const { category } = req.params;

    // -------------------------------------------------
    // GET ALL ACTIVE EMBEDDED SKILLS
    // -------------------------------------------------
    if (category === 'skill') {

        const domains = await Lookup.find({
            category: 'skillDomain',
            status: 'active'
        }).sort({ name: 1 });

        const skills = [];

        domains.forEach(domain => {

            domain.skills
                .filter(skill => skill.status === 'active')
                .forEach(skill => {

                    skills.push({
                        _id: skill._id,
                        name: skill.name,
                        status: skill.status,
                        domainId: domain._id,
                        domain: domain.name
                    });

                });

        });

        return res.status(200).json(skills);
    }

    // -------------------------------------------------
    // GET NORMAL LOOKUP ITEMS
    // -------------------------------------------------
    const items = await Lookup.find({
        category,
        status: 'active'
    }).sort({ name: 1 });

    return res.status(200).json(items);
});


// =====================================================
// 2. CREATE ITEM
// =====================================================
const createItem = asyncHandler(async (req, res) => {

    const { category } = req.params;
    const { name, icon, domainId, skills } = req.body;

    // -------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------
    if (!name || !name.trim()) {
        return res.status(400).json({
            message: 'Name is required'
        });
    }

    const trimmedName = name.trim();

    // =====================================================
    // CREATE SKILL DOMAIN
    // =====================================================
    if (category === 'skillDomain') {

        const existingDomain = await Lookup.findOne({
            category: 'skillDomain',
            name: {
                $regex: new RegExp(`^${trimmedName}$`, 'i')
            }
        });

        // Existing active domain
        if (existingDomain && existingDomain.status === 'active') {
            return res.status(400).json({
                message: `Skill domain "${trimmedName}" already exists`
            });
        }

        // Reactivate existing inactive domain
        if (existingDomain && existingDomain.status === 'inactive') {

            existingDomain.status = 'active';
            existingDomain.icon = icon || existingDomain.icon;
            existingDomain.updatedBy = req.user?.usr_id || 'admin';

            if (Array.isArray(skills)) {

                skills.forEach(skill => {

                    const skillName =
                        typeof skill === 'string'
                            ? skill.trim()
                            : String(skill.name || '').trim();

                    if (!skillName) return;

                    const alreadyExists = existingDomain.skills.some(
                        s =>
                            s.name.toLowerCase() === skillName.toLowerCase()
                    );

                    if (!alreadyExists) {
                        existingDomain.skills.push({
                            name: skillName,
                            status: 'active'
                        });
                    }
                });
            }

            await existingDomain.save();

            return res.status(200).json({
                message: `Skill domain "${trimmedName}" reactivated successfully`,
                item: existingDomain
            });
        }

        // Create new domain
        const newDomain = await Lookup.create({
            category: 'skillDomain',
            name: trimmedName,
            icon: icon || null,

            skills: Array.isArray(skills)
                ? skills
                    .map(skill => ({
                        name: (
                            typeof skill === 'string'
                                ? skill
                                : skill.name
                        ).trim(),
                        status: 'active'
                    }))
                    .filter(skill => skill.name)
                : [],

            status: 'active',

            createdBy: req.user?.usr_id || 'admin',
            updatedBy: req.user?.usr_id || 'admin'
        });

        return res.status(201).json({
            message: 'Skill domain created successfully',
            item: newDomain
        });
    }


    // =====================================================
    // ADD SKILL INSIDE EXISTING DOMAIN
    // =====================================================
    if (category === 'skill') {

        if (!domainId) {
            return res.status(400).json({
                message: 'domainId is required to add a skill'
            });
        }

        const domain = await Lookup.findOne({
            _id: domainId,
            category: 'skillDomain',
            status: 'active'
        });

        if (!domain) {
            return res.status(404).json({
                message: 'Skill domain does not exist'
            });
        }

        // -------------------------------------------------
        // CHECK ACTIVE DUPLICATE
        // -------------------------------------------------
        const activeSkill = domain.skills.find(
            skill =>
                skill.name.toLowerCase() === trimmedName.toLowerCase() &&
                skill.status === 'active'
        );

        if (activeSkill) {
            return res.status(400).json({
                message:
                    `Skill "${trimmedName}" already exists in "${domain.name}"`
            });
        }

        // -------------------------------------------------
        // REACTIVATE INACTIVE SKILL
        // -------------------------------------------------
        const inactiveSkill = domain.skills.find(
            skill =>
                skill.name.toLowerCase() === trimmedName.toLowerCase() &&
                skill.status === 'inactive'
        );

        if (inactiveSkill) {

            inactiveSkill.status = 'active';

            domain.updatedBy = req.user?.usr_id || 'admin';

            await domain.save();

            return res.status(200).json({
                message:
                    `Skill "${trimmedName}" reactivated successfully`,
                item: inactiveSkill
            });
        }

        // -------------------------------------------------
        // CREATE NEW SKILL
        // -------------------------------------------------
        domain.skills.push({
            name: trimmedName,
            status: 'active'
        });

        domain.updatedBy = req.user?.usr_id || 'admin';

        await domain.save();

        return res.status(201).json({
            message:
                `Skill "${trimmedName}" added successfully to "${domain.name}"`,
            item: domain
        });
    }


    // =====================================================
    // CREATE NORMAL LOOKUP
    // =====================================================

    const existingItem = await Lookup.findOne({
        category,
        name: {
            $regex: new RegExp(`^${trimmedName}$`, 'i')
        }
    });

    // -------------------------------------------------
    // ACTIVE ITEM ALREADY EXISTS
    // -------------------------------------------------
    if (existingItem && existingItem.status === 'active') {

        return res.status(400).json({
            message: `${category} already exists`
        });
    }

    // -------------------------------------------------
    // REACTIVATE INACTIVE ITEM
    // -------------------------------------------------
    if (existingItem && existingItem.status === 'inactive') {

        existingItem.status = 'active';
        existingItem.updatedBy = req.user?.usr_id || 'admin';

        await existingItem.save();

        return res.status(200).json({
            message: `${category} reactivated successfully`,
            item: existingItem
        });
    }

    // -------------------------------------------------
    // CREATE NEW LOOKUP
    // -------------------------------------------------
    const newItem = await Lookup.create({
        category,
        name: trimmedName,
        icon: icon || null,
        status: 'active',
        createdBy: req.user?.usr_id || 'admin',
        updatedBy: req.user?.usr_id || 'admin'
    });

    return res.status(201).json({
        message: `${category} created successfully`,
        item: newItem
    });
});


// =====================================================
// 3. UPDATE ITEM
// =====================================================
const updateItem = asyncHandler(async (req, res) => {

    const { category, id } = req.params;
    const { name, status, icon } = req.body;

    // =====================================================
    // UPDATE EMBEDDED SKILL
    // =====================================================
    if (category === 'skill') {

        const domain = await Lookup.findOne({
            category: 'skillDomain',
            'skills._id': id
        });

        if (!domain) {
            return res.status(404).json({
                message: 'Skill not found'
            });
        }

        const skill = domain.skills.id(id);

        if (!skill) {
            return res.status(404).json({
                message: 'Skill not found'
            });
        }

        if (name !== undefined) {

            const trimmedName = name.trim();

            if (!trimmedName) {
                return res.status(400).json({
                    message: 'Skill name is required'
                });
            }

            const duplicate = domain.skills.some(
                s =>
                    s._id.toString() !== id &&
                    s.name.toLowerCase() === trimmedName.toLowerCase() &&
                    s.status === 'active'
            );

            if (duplicate) {
                return res.status(400).json({
                    message:
                        `Skill "${trimmedName}" already exists in "${domain.name}"`
                });
            }

            skill.name = trimmedName;
        }

        if (status !== undefined) {
            skill.status = status;
        }

        domain.updatedBy = req.user?.usr_id || 'admin';

        await domain.save();

        return res.status(200).json({
            message: 'Skill updated successfully',
            item: skill
        });
    }


    // =====================================================
    // UPDATE NORMAL LOOKUP
    // =====================================================

    const item = await Lookup.findOne({
        _id: id,
        category
    });

    if (!item) {
        return res.status(404).json({
            message: 'Item not found'
        });
    }

    if (name !== undefined) {

        const trimmedName = name.trim();

        if (!trimmedName) {
            return res.status(400).json({
                message: 'Name is required'
            });
        }

        const duplicate = await Lookup.findOne({
            _id: { $ne: id },
            category,
            name: {
                $regex: new RegExp(`^${trimmedName}$`, 'i')
            },
            status: 'active'
        });

        if (duplicate) {
            return res.status(400).json({
                message: `${category} already exists`
            });
        }

        item.name = trimmedName;
    }

    if (status !== undefined) {
        item.status = status;
    }

    if (icon !== undefined) {
        item.icon = icon;
    }

    item.updatedBy = req.user?.usr_id || 'admin';

    await item.save();

    return res.status(200).json({
        message: 'Updated successfully',
        item
    });
});


// =====================================================
// 4. DELETE ITEM - SOFT DELETE
// =====================================================
const deleteItem = asyncHandler(async (req, res) => {

    const { category, id } = req.params;

    // =====================================================
    // DELETE EMBEDDED SKILL
    // =====================================================
    if (category === 'skill') {

        const domain = await Lookup.findOne({
            category: 'skillDomain',
            'skills._id': id
        });

        if (!domain) {
            return res.status(404).json({
                message: 'Skill not found'
            });
        }

        const skill = domain.skills.id(id);

        if (!skill) {
            return res.status(404).json({
                message: 'Skill not found'
            });
        }

        const skillName = skill.name;

        // Soft delete
        skill.status = 'inactive';

        domain.updatedBy = req.user?.usr_id || 'admin';

        await domain.save();

        return res.status(200).json({
            message:
                `Skill "${skillName}" deleted successfully`
        });
    }


    // =====================================================
    // DELETE NORMAL LOOKUP
    // =====================================================

    const item = await Lookup.findOne({
        _id: id,
        category
    });

    if (!item) {
        return res.status(404).json({
            message: 'Item not found'
        });
    }

    const itemName = item.name;

    // Soft delete
    item.status = 'inactive';

    item.updatedBy = req.user?.usr_id || 'admin';

    await item.save();

    return res.status(200).json({
        message:
            `${category} "${itemName}" deleted successfully`
    });
});


// =====================================================
// 5. GET GROUPED SKILLS
// =====================================================
const getGroupedSkills = asyncHandler(async (req, res) => {

    const domains = await Lookup.find({
        category: 'skillDomain',
        status: 'active'
    }).sort({ name: 1 });

    const formattedData = domains.map(domain => ({

        _id: domain._id,

        domain: domain.name,

        icon: domain.icon,

        status: domain.status,

        skills: domain.skills
            .filter(skill => skill.status === 'active')
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            )

    }));

    return res.status(200).json(formattedData);
});


module.exports = {
    getItems,
    createItem,
    updateItem,
    deleteItem,
    getGroupedSkills
};
