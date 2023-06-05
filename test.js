function traverseJSON(obj, row, path = '', count = null, keyVal = {}, vIndex = undefined) {

    for (let key in obj) {
        const newPath = path ? `${path}.${key}` : key;
        /**
         * True if value of obj[key] is an object
         * Else it is leaf node containing simple value 
         */
        if (typeof obj[key] === 'object') {
            /**
             * True if the key is one of the entities containing array of objects
             * Else handles rest of the keys.  e.g: ValidityStartDate
             */
            if (entities.includes(key)) {
                let elements;

                /**
                 * Index for filtered array
                 */
                const _vIndex = [];
                const fieldName = Object.keys(obj[key][0])[0];
                const sheetName = obj[key][0][fieldName].sheetName;

                const internalIndex = Object.keys(keyVal).map(v => fieldMap[sheetName][v]);
                const valueToMatch = Object.values(keyVal).map(v => v);
                elements = row.value[sheetName] ? row.value[sheetName].content : [];
                elements = elements.filter((el, index) => {
                    let valid = true;
                    internalIndex.forEach((_internalIndex, _index) => {
                        if (el[_internalIndex] != valueToMatch[_index]) {
                            valid = false;
                        }
                    });

                    if (valid) {
                        _vIndex.push(index);
                    }

                    return valid;

                });

                if (elements.length === 0) {
                    obj[key] = [];
                }

                for (let _ = 1; _ < elements.length; _++) {
                    obj[key].push(deepCopy(obj[key][0]));
                }

                for (const _ in obj[key]) {
                    const o = {};
                    for (let k in keyMap[key]) {
                        const _index = fieldMap[obj[key][_][keyMap[key][k]].sheetName][keyMap[key][k]];
                        o[keyMap[key][k]] = row.value[obj[key][_][Object.keys(obj[key][_])[0]].sheetName].content[_][_index];
                    }
                    traverseJSON(obj[key][_], row, newPath, _, Object.keys(o).length > 0 ? o : keyVal, _vIndex);
                }

            }
            else {
                traverseJSON(obj[key], row, newPath, count, keyVal, vIndex);
                if (obj[key].hasOwnProperty('sheetName') && obj[key].hasOwnProperty('value')) {
                    obj[key] = obj[key].value;
                }
            }

        } else {
            /**
             * If key is sheetName, this key stores the mapping value for the excel sheet name in which the technical field can be found
             * Else it was not found in the current excel
             */
            if (key === 'sheetName') {
                const _path = path.split('.').splice(-1,).toString();
                if (fieldMap[obj[key]]) {
                    
                    const index = fieldMap[obj[key]][_path];
                    const contentIndex = vIndex !== undefined ? vIndex[count] !== undefined ? vIndex[count] : count : count;

                    if (row.value[obj[key]] == undefined){
                        obj.value = undefined;
                        return;
                    }

                    let value = row.value[obj[key]].content[contentIndex || 0][index];

                    if (obj.type && obj.type === 'boolean') {
                        value = value != null ? true : false;
                    }
                    else if (dateFields.includes(_path)) {
                        value = getFormattedDate(value);
                    }

                    obj.value = value;

                    // obj.isMandatory - for validation
                    if (obj.isMandatory === true) {
                        if (obj.value === undefined) {
                            const primaryKey = row.value[obj[key]].content[contentIndex || 0][0];
                            if (primaryKey) {
                                 errors.push(`Field "${_path}" in "${obj.sheetName}" \n`);

                            }
                        }
                    }

                }
            }
        }
    }
}
