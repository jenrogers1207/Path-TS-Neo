import "./styles.scss";
import * as d3 from 'D3';
import { QueryObject, VariantObject } from "./queryObject";
import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';



d3.select('.search-icon').on('click', () => {
    const value = (document.getElementById('search-bar')).value;
    let dataOb = new qo.QueryObject(value);
    neoAPI.checkForNode(value).then(found => {
        if (found.length > 0) {
            console.log("already exists");
        } else {
            neoAPI.addToGraph(value, 'Gene');
        }
        search.searchBySymbol(dataOb).then(() => neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));

    });
});

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(d=> {
    dataLoad.renderSidebar(d);
    let dataOb = new qo.QueryObject(d[0].key);
    dataOb.type = "Gene";

    let varArray = d[0].values.map(v=> {
        let variant = new qo.QueryObject(v.id);
        variant.type = "Variant";
        Object.keys(v).map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.Gene = d[0].key;
            variant.description = variant.name;
            variant.name = variant.dbSnps;
        });
        return variant
    });
  
    dataOb.fileVariants = varArray;
    
    search.searchBySymbol(dataOb).then(q=> {
        /*
        neoAPI.addNode(q);
        console.log(q.fileVariants);
        q.fileVariants.forEach((variant) => {
           // neoAPI.addNode(variant);
           console.log(variant)
        });*/
      
        
        search.geneIdtoMim(q).then(d=> {
            searchOMIM(d).then(om=>{  
                console.log(om);
                neoAPI.addNode(om, 'Gene');

        console.log('OM', om)

    let knownVariants = om.properties.allelicVariantList.map(v=> {
        let variantOb = new qo.VariantObject(v.dbSnps);
       // variantOb.properties = v;
       console.log('v', v)
        variantOb.name = v.dbSnps;
        variantOb.gene = om.value;
        variantOb.mimNumber = v.mimNumber;
        variantOb.mutations = v.mutations;
        variantOb.description = v.name;
        variantOb.clinvarAccessions = variantOb.clinvarAccessions;
        variantOb.text = v.text;
        
        return variantOb;
    });

    neoAPI.addVariants(knownVariants).then(()=> {
        knownVariants.forEach(v=>{
            neoAPI.addRelation(v.name, 'Variant', om.value, 'Gene', 'Mutation');
        })
        neoAPI.getGraph().then(g => gCanvas.drawGraph(g));
    });

    /*
    om.fileVariants.forEach(variant => {
        console.log(variant);
        let value = variant.properties.id;

        let proxy = 'https://cors-anywhere.herokuapp.com/';
        let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+value+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
       // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
        let req = ky.get(proxy + url).json().then(d=> {
            
            console.log(d);
            console.log(d.result[value])
        
        });
    
       // console.log(req);

        
    });*/
/*
    let variantIds = om.fileVariants.map(v=> v.properties.id);

    let varIdQuery = variantIds.join(',')

    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+varIdQuery+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let req = ky.get(proxy + url).json().then(d=> console.log(d));

    console.log(req);


    console.log(varIdQuery);
    /*
                /*
                search.getPathways(om);
                gCanvas.renderGeneDetail(om);
                neoAPI.addNode(om, 'Gene');
                om.properties.allelicVariantList.forEach((variant) => {
                    variant.gene = om.value
                    neoAPI.addNode(variant, 'Variant').then(()=>{ 
                        neoAPI.addRelation(om.value,'Gene', variant.name, 'Variant', 'Mutation');
                    });
                 }).then(()=> neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));*/
              //  .then(()=> neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));
            });

        });
        

//neoAPI.getGraph().then(g => gCanvas.drawGraph(g));
    });
});